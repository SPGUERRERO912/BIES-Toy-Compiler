import fs from 'fs';
import test_parser from '../src/printVisitor.mjs';
import { jest } from '@jest/globals';

const compareOutputs = (output, expectedOutputPath) => {
    const expectedOutput = fs.readFileSync(expectedOutputPath, 'utf-8').trim();
    const normalizedOutput = output.trim().replace(/\s+/g, ' ');
    const normalizedExpected = expectedOutput.replace(/\s+/g, ' ');
    return normalizedOutput === normalizedExpected; 
}; 

describe('BASM VM Test Cases', () => {
  const testCases = [
    { input: './input/testcase1.basm', expected: './input/expected_outputs/expected_output1.txt' },
    { input: './input/testcase2.basm', expected: './input/expected_outputs/expected_output2.txt' },
    { input: './input/testcase3.basm', expected: './input/expected_outputs/expected_output3.txt' },
    { input: './input/testcase4.basm', expected: './input/expected_outputs/expected_output4.txt' },
    { input: './input/testcase5.basm', expected: './input/expected_outputs/expected_output5.txt' },
    { input: './input/testcase6.basm', expected: './input/expected_outputs/expected_output6.txt' },
    { input: './input/testcase7.basm', expected: './input/expected_outputs/expected_output7.txt' },
    { input: './input/testcase8.basm', expected: './input/expected_outputs/expected_output8.txt' },
    { input: './input/testcase9.basm', expected: './input/expected_outputs/expected_output9.txt' },
    { input: './input/testcase10.basm', expected: './input/expected_outputs/expected_output10.txt'},
    { input: './input/testcase11.basm', expected: './input/expected_outputs/expected_output11.txt'}
  ];

  testCases.forEach(({ input, expected }, index) => {
    test(`Test case ${index++}`, () => {
        let originalConsoleLog = console.log; 
        console.log = jest.fn();
        //console.log(`Captured output for test case ${index + 1}:`, console.log.mock.calls);
       // originalConsoleLog('Input:', JSON.stringify(input, null, 2));
        test_parser(input);
        
        let output = console.log.mock.calls.map(call => call[0]).join('\n');
        

        console.log = originalConsoleLog;

        originalConsoleLog('Output:', JSON.stringify(output, null, 2));
        originalConsoleLog('Expected:', JSON.stringify(fs.readFileSync(expected, 'utf-8').trim(), null, 2));
      
        console.log = originalConsoleLog;
      
        expect(compareOutputs(output, expected)).toBe(true);
    });
  });
  
  



});
