import test from 'node:test';
import assert from 'node:assert/strict';
import {detect, indentInput, highlight, register} from '../hooks/register.mjs';
const atEnd = (text,inputText='\n') => ({text,start:text.length,end:text.length,inputText});
test('detect languages conservatively',()=>{
 assert.equal(detect('def greet():\n    pass'),'python');
 assert.equal(detect('const x = 1;'),'javascript');
 assert.equal(detect('interface User { name: string }'),'typescript');
 assert.equal(detect('Can you explain this?'),'plain');
});
test('python indentation and continuation',()=>{
 assert.equal(indentInput(atEnd('def greet():'),'python'),'\n    ');
 assert.equal(indentInput(atEnd('    print(1)'),'python'),'\n    ');
 assert.equal(indentInput(atEnd('    if ok:'),'python'),'\n        ');
});
test('JS indentation; preserves paste and plain text',()=>{
 assert.equal(indentInput(atEnd('if (ok) {'),'javascript'),'\n  ');
 assert.equal(indentInput(atEnd('a','\n  b\n c'),'python'),'\n  b\n c');
 assert.equal(indentInput(atEnd('hello:'),'plain'),'\n');
 assert.equal(indentInput(atEnd('','\t'),'python'),'    ');
});
test('highlight offsets; strings and comments protected',()=>{
 const s='def f():\n    return "if" # while';
 const words=highlight(s,'python').map(r=>s.slice(r.start,r.end));
 assert.deepEqual(words,['def','return','"if"','# while']);
 assert.deepEqual(highlight('a'.repeat(17000),'python'),[]);
});
test('native hook rewrites only in active mode and honors off',async()=>{
 const handlers=[]; register((event,...args)=>handlers.push({event,fn:args.at(-1),matcher:args.length===2?args[0]:null}));
 const edit=handlers.find(h=>h.event==='prompt.edit').fn;
 const command=handlers.find(h=>h.matcher?.command==='codemode').fn;
 const $={ui:{invalidate(){}}};
 const next=async e=>({text:e.text.slice(0,e.start)+e.inputText+e.text.slice(e.end),cursor:e.start+e.inputText.length});
 let e=atEnd('def f():');
 assert.equal((await edit($,e,next)).text,'def f():\n');
 await command($,{args:'python'});
 assert.equal((await edit($,e,next)).text,'def f():\n    ');
 await command($,{args:'off'});
 assert.equal((await edit($,e,next)).text,'def f():\n');
});

test('PHP detection, highlighting and four-space indentation',()=>{
 const s='<?php\nfunction greet($name) {\n    echo "Hi"; // comment\n}';
 assert.equal(detect(s),'php');
 assert.equal(detect('$name = "Ada";'),'php');
 assert.equal(detect('function greet($name) {'),'php');
 assert.equal(indentInput(atEnd('function greet($name) {'),'php'),'\n    ');
 assert.equal(indentInput(atEnd('','\t'),'php'),'    ');
 assert.deepEqual(highlight(s,'php').map(r=>s.slice(r.start,r.end)),['<?php','function','$name','echo','"Hi"','// comment']);
});
