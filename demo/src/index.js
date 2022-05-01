import { greet } from './a.js';

function test() {
  greet();
  console.log('hello');
}
window.test = test;
