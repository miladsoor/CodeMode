import {phpWords, phpPattern, isPHP} from './php.mjs';
// CodeMode: no network, file writes, subprocesses or model calls.
const languages = ['auto', 'python', 'javascript', 'typescript', 'php', 'plain'];
const aliases = { py: 'python', js: 'javascript', ts: 'typescript', text: 'plain' };
const MAX = 16000;
const pyWords = new Set('and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield match case'.split(' '));
const jsWords = new Set('async await break case catch class const continue debugger default delete do else export extends false finally for function if import in instanceof let new null of return super switch this throw true try typeof undefined var void while with yield interface type enum implements private public protected readonly as satisfies namespace declare abstract'.split(' '));

export function detect(text) {
  const s = text.slice(0, MAX);
  if (isPHP(s)) return 'php';
  if (/^\s*```(?:typescript|ts)\b/im.test(s) || /(?:^|\n)\s*(?:export\s+)?(?:interface|type)\s+\w+\s*[={]/.test(s)) return 'typescript';
  if (/^\s*```(?:python|py)\b/im.test(s) || /(?:^|\n)\s*(?:async\s+)?def\s+\w+\s*\(|(?:^|\n)\s*from\s+\w+(?:\.\w+)*\s+import\s+|(?:^|\n)\s*(?:if|for|while|class|elif)\b[^\n]*:\s*(?:\n|$)/.test(s)) return 'python';
  if (/^\s*```(?:javascript|js)\b/im.test(s) || /(?:^|\n)\s*(?:export\s+)?(?:const|let|var)\s+\w+\s*=|(?:^|\n)\s*(?:async\s+)?function\s+\w+\s*\(|\bconsole\.log\(/.test(s)) return 'javascript';
  return 'plain';
}

export function indentInput(e, lang) {
  if (lang === 'plain') return e.inputText;
  if (e.inputText === '\t') return ' '.repeat(['python','php'].includes(lang) ? 4 : 2);
  if (e.inputText !== '\n' || e.start !== e.end) return e.inputText;
  const before = e.text.slice(0, e.start).split('\n').at(-1);
  const base = before.match(/^[ \t]*/)[0];
  // Simple heuristic, not a parser. Don't modify multi-line pastes.
  const trimmed = before.trimEnd();
  const extra = lang === 'python' ? /:\s*(?:#.*)?$/.test(trimmed) : /\{\s*(?:\/\/.*)?$/.test(trimmed);
  return '\n' + base + (extra ? ' '.repeat(['python','php'].includes(lang) ? 4 : 2) : '');
}

export function highlight(text, lang) {
  if (lang === 'plain' || text.length > MAX) return [];
  const python = lang === 'python';
  const php = lang === 'php';
  const keywords = php ? phpWords : python ? pyWords : jsWords;
  const rx = php ? phpPattern : python
    ? /#[^\n]*|"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b/g
    : /\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)|`(?:\\.|[^`\\])*`?|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b/g;
  const out = [];
  for (const m of text.matchAll(rx)) {
    const t = m[0];
    const style = ((python || php) && t.startsWith('#') || !python && /^\/[/\*]/.test(t)) ? {dimColor:true}
      : /^["'`]/.test(t) ? {color:'success'} : /^\d/.test(t) ? {color:'warning'}
      : php && t.startsWith('$') ? {color:'suggestion'} : php && /^(?:<\?|\?>)/.test(t) ? {color:'suggestion',bold:true} : keywords.has(php ? t.toLowerCase() : t) ? {color:'suggestion',bold:true} : null;
    if (style) out.push({start:m.index, end:m.index+t.length, ...style});
    if (out.length >= 400) break;
  }
  return out;
}

export function register(on) {
  let enabled = false;
  let selected = 'auto';
  let autoPaste = true;
  let commandName = 'code';
  const redraw = $ => $.ui.invalidate('ui.render');
  function setMode(args) {
    const arg = args.trim().toLowerCase();
    if (!arg) { enabled = !enabled; return true; }
    if (arg === 'off') { enabled = false; autoPaste = false; return true; }
    if (arg === 'on') { enabled = true; autoPaste = true; return true; }
    const lang = aliases[arg] ?? arg;
    if (!languages.includes(lang)) return false;
    enabled = true; selected = lang; autoPaste = true; return true;
  }
  on('session.start', async ($, e, next) => {
    await $.command.register({name:'codemode', description:'Toggle CodeMode or choose language', argumentHint:'[python|javascript|typescript|php|auto|plain|off]'});
    try { await $.command.register({name:'code', description:'Toggle CodeMode in the native prompt', argumentHint:'[language|off]'}); }
    catch { commandName = 'codemode'; }
    return next(e);
  });
  const command = async ($, e) => {
    if (!setMode(e.args ?? '')) return {text:'Usage: /codemode [on|off|auto|python|javascript|typescript|php|plain]'};
    redraw($);
    return {};
  };
  on('command.run', {command:'codemode'}, command);
  on('command.run', {command:'code'}, async ($,e,next) => commandName === 'code' ? command($,e) : next(e));
  on('prompt.edit', async ($, e, next) => {
    const candidate = e.text.slice(0,e.start) + e.inputText + e.text.slice(e.end);
    if (!enabled && autoPaste && !e.text.trim() && e.inputText.includes('\n') && detect(candidate) !== 'plain') {
      enabled = true; selected = 'auto'; redraw($);
    }
    if (!enabled) return next(e);
    const lang = selected === 'auto' ? detect(candidate) : selected;
    const inputText = indentInput(e,lang);
    const r = await next(inputText === e.inputText ? e : {...e,inputText});
    const actual = selected === 'auto' ? detect(r.text) : selected;
    return {...r, decorations:[...(r.decorations ?? []), ...highlight(r.text,actual)]};
  });
  on('ui.render', {component:'AbovePrompt'}, async ($, e, next) => {
    if (e.surface !== 'terminal') return next(e);
    const {Box,Text,Button} = $.ui.resolve(e);
    return Box({flexDirection:'row',columnGap:2,children:[
      Button({key:'codemode-toggle',label:enabled?'Code: ON':'Code: OFF',onPress:()=>{enabled=!enabled;autoPaste=enabled;redraw($);}}),
      Text({dimColor:true,children:[enabled?`${selected} · Ctrl+J newline · /${commandName} off`:`/${commandName} python`]})
    ]});
  });
}
