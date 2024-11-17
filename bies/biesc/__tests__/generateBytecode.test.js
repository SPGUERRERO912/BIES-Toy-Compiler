/**
 * @author Joel Ramirez
 * @author Sebastian Peñaranda
 * @author Marco Leandro
 * @version 1.0
 * @since 2024-11-16
 */

import fs from 'fs';
import generateBytecode from '../src/printVisitor_bies.mjs';
import { jest } from '@jest/globals';

const compareOutputs = (output, expectedOutputPath) => {
    const expectedOutput = fs.readFileSync(expectedOutputPath, 'utf-8').trim();
    const normalizedOutput = output.trim().replace(/\s+/g, ' ');
    const normalizedExpected = expectedOutput.replace(/\s+/g, ' ');
    return normalizedOutput === normalizedExpected;
};

describe('BASM C Test Cases', () => {
    const testCases = [
        { 
            input: './input/testcase1c.bies',
            output: '../biesvm/input/testcase1c.basm', 
            expected: './input/expected_outputs/expected_output1.txt' 
        },
        { 
            input: './input/Version_Compleja_0.bies',
            output: '../biesvm/input/Version_Compleja_0.basm', 
            expected: './input/expected_outputs/expected_output2.txt' 
        },
        { 
            input: './input/Version_Compleja_1.bies',
            output: '../biesvm/input/Version_Compleja_1.basm', 
            expected: './input/expected_outputs/expected_output3.txt' 
        },
        { 
            input: './input/Version_Compleja_2.bies',
            output: '../biesvm/input/Version_Compleja_2.basm', 
            expected: './input/expected_outputs/expected_output4.txt' 
        },
        { 
            input: './input/Version_Compleja_3.bies',
            output: '../biesvm/input/Version_Compleja_3.basm', 
            expected: './input/expected_outputs/expected_output5.txt' 
        },
        { 
            input: './input/Version_Compleja_4.bies',
            output: '../biesvm/input/Version_Compleja_4.basm', 
            expected: './input/expected_outputs/expected_output6.txt' 
        },
        { 
            input: './input/Version_Compleja_6.bies',
            output: '../biesvm/input/Version_Compleja_6.basm', 
            expected: './input/expected_outputs/expected_output8.txt' 
        },
        { 
            input: './input/Version_Compleja_7.bies',
            output: '../biesvm/input/Version_Compleja_7.basm', 
            expected: './input/expected_outputs/expected_output9.txt' 
        },
        { 
            input: './input/Version_Compleja_8.bies',
            output: '../biesvm/input/Version_Compleja_8.basm', 
            expected: './input/expected_outputs/expected_output10.txt' 
        }

    ];

    testCases.forEach(({ input, output, expected }, index) => {
        test(`Test case ${index + 1}`, () => {
            // Mock console.log
            const originalConsoleLog = console.log; 
            console.log = jest.fn();

            // Generate bytecode
            generateBytecode(input, output);

            // Read the generated output file
            const generatedContent = fs.readFileSync(output, 'utf-8').trim();

            // Restore console.log
            console.log = originalConsoleLog;

            // Log debug info (optional)
            originalConsoleLog('Generated Content:', generatedContent);
            originalConsoleLog('Expected Content:', fs.readFileSync(expected, 'utf-8').trim());

            // Compare outputs
            expect(compareOutputs(generatedContent, expected)).toBe(true);
        });
    });
});
