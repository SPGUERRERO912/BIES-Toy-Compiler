import { Command } from 'commander';
import fs from 'fs';
import generateBytecode from './src/printVisitor_bies.mjs'

//generateBytecode('../biesc/input/Version_Compleja_0.bies', '../biesvm/input/Version_Compleja_0.basm');


const program = new Command();

program
    .option('--o <outfile>','Archivo para salida de sysout', 'sysout.log')
    .option('--e <errfile>', 'Archivo para salida de errores (syserr)', 'syserr.log')
    .argument('<inputfile>', 'Archivo de entrada (.bies)')
    .argument('<outputfile>', 'Archivo de salida (.basm)');

program.parse(process.argv);

const options = program.opts();
const outfile = options.o;
const errfile = options.e;
const inputFile = program.args[0];
const outputFile = program.args[1];

console.log(`Outfile: ${outfile}`);
console.log(`Errfile: ${errfile}`);
console.log(`Input file: ${inputFile}`);
console.log(`Output file: ${outputFile}`);

try {
  // Crear streams con manejo de errores
  const sysout = fs.createWriteStream(outfile, { flags: 'w' });
  const syserr = fs.createWriteStream(errfile, { flags: 'w' });

  sysout.on('error', (err) => {
    console.error(`Error al crear sysout: ${err.message}`);
    process.exit(1);
  });

  syserr.on('error', (err) => {
    console.error(`Error al crear syserr: ${err.message}`);
    process.exit(1);
  });

  // Redefinir console.log y console.error para escribir en los streams
  console.log = (message) => {
    sysout.write(message + '\n');
  };

  console.error = (message) => {
    syserr.write(message + '\n');
  };

  // Mensajes informativos en el log de salida
  console.log('Iniciando generación de bytecode...');
  console.log(`Archivo de entrada: ${inputFile}`);
  console.log(`Archivo de salida: ${outputFile}`);

  // Generar el bytecode
  generateBytecode(inputFile, outputFile);

  console.log('Generación de bytecode completada exitosamente.');
  console.log(`El bytecode se ha guardado en "${outputFile}".`);

  syserr.write('No se registraron errores durante la ejecución.\n');
  sysout.end(); // Cerrar el flujo de salida al finalizar
  syserr.end();
} catch (error) {
  console.error(`Error durante la ejecución: ${error.message}`);
}