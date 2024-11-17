/**
 * @author Joel Ramirez
 * @author Sebastian Peñaranda
 * @author Marco Leandro
 * @version 1.0
 * @since 2024-11-16
 */

import { Command } from 'commander';
import fs from 'fs';
import test_parser from './src/printVisitor.mjs';

const program = new Command();

program
    .option('--o <outfile>', 'Archivo para salida de sysout', 'sysout.log')
    .option('--e <errfile>', 'Archivo para salida de errores (syserr)', 'syserr.log')
    .option('--trace <level>', 'Nivel de traza (0 = sin traza, 1 = traza básica)', 0)
    .argument('<inputfile>', 'Archivo de entrada');

program.parse(process.argv);

const options = program.opts();
const outfile = options.o;
const errfile = options.e;
const inputFile = program.args[0];
const traceLevel = parseInt(options.trace, 10);
console.log(`BIESVM______________________`);
console.log(`Outfile_vm: ${outfile}`);
console.log(`Errfile_vm: ${errfile}`);
console.log(`Input file_vm: ${inputFile}`);

const sysout = fs.createWriteStream(outfile, { flags: 'w' });
const syserr = fs.createWriteStream(errfile, { flags: 'w' });

console.log = (message) => {
  sysout.write(message + '\n');
};

console.error = (message) => {
  syserr.write(message + '\n');
};

try {
  test_parser(inputFile,traceLevel );
} catch (error) {
  console.error(`Error: ${error.message}`);
}

if (traceLevel === 1) {
  console.error('>>> Trace mode enabled: level 1');
}

sysout.end();
syserr.end();