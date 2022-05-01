import { greet } from './a.js';
import data from './data.txt';
function test() {
  greet();
  console.log('hello');
  console.log('data', data);
}
window.test = test;
