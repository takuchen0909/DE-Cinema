import {test} from 'node:test';
import assert from 'node:assert/strict';
import {descriptionParts} from '../lib/description.ts';
test('preserves ordinary text and line breaks',()=>{
 const text='First paragraph\n\n第二段 <b>text</b>';
 assert.deepEqual(descriptionParts(text),[{text}]);
});
test('creates named links and keeps query parameters',()=>{
 assert.deepEqual(descriptionParts('Visit [电影介绍](https://example.com/film?q=1&lang=zh).'),[
  {text:'Visit '},{text:'电影介绍',href:'https://example.com/film?q=1&lang=zh'},{text:'.'}
 ]);
});
test('recognizes pasted URLs and excludes trailing punctuation',()=>{
 assert.deepEqual(descriptionParts('https://example.com。'),[{text:'https://example.com',href:'https://example.com/'},{text:'。'}]);
});
test('does not activate unsafe or invalid links',()=>{
 for(const text of ['[bad](javascript:alert%281%29)','[bad](data:text/html,test)','[bad](https://)','<script>alert(1)</script>']){
  assert(descriptionParts(text).every(part=>!part.href));
  assert.equal(descriptionParts(text).map(part=>part.text).join(''),text);
 }
});
test('multiple links and encoded parentheses',()=>{
 const parts=descriptionParts('[One](https://example.com/a%28b%29) and [Two](http://example.org/)');
 assert.equal(parts.filter(part=>part.href).length,2);
 assert.equal(parts[0].href,'https://example.com/a%28b%29');
});
