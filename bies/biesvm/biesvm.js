#!/usr/bin/env node

import path from 'path';
import { Command } from 'commander';
import { exec } from 'child_process';

const program = new Command();

program
    .name("biesvm")
    .description("Automatiza la ejecución del comando BIESC")
    .argument("<basmFile>", "Nombre del archivo de entrada BIESVM")
    .action((basmFile) => {
        // Ruta al archivo de entrada
        const inputPath = path.resolve("input", basmFile);



        const commandVM = `node index.js --o BIESVM_OUT.log --e BIESVM_ERROR.log --trace 0 ${inputPath}`;

        // Ejecutar el primer comando y esperar a que termine
        exec(commandVM, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error en el comando BIESVM: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`Stderr en BIESVM: ${stderr}`);
                return;
            }
            console.log("BIESVM_______________________");
            console.log(`${stdout}`);

        });
    });

program.parse();
