#!/usr/bin/env node
/**
 * @author Joel Ramirez
 * @author Sebastian Peñaranda
 * @author Marco Leandro
 * @version 1.0
 * @since 2024-11-16
 */
import path from 'path';
import { Command } from 'commander';
import { exec } from 'child_process';
import { spawnSync } from 'child_process';

const program = new Command();

program
    .name("biesc")
    .description("Automatiza la ejecución del comando BIESC")
    .argument("<biesFile>", "Nombre del archivo de entrada BIESC")
    .action((biesFile) => {
        // Ruta al archivo de entrada
        const inputPath = path.resolve("input", biesFile);

        // Nombre base para generar .basm
        const outputfile = path.basename(biesFile, '.bies');
        const basename = path.resolve("../biesvm/input", outputfile + ".basm");
        const vmPath = path.resolve("../biesvm");
   
        const command = `node index.js --o BIESC_OUT.log --e BIESC_ERROR.log ${inputPath} ${basename}`;
        const commandVM = `node index.js --o BIESVM_OUT.log --e BIESVM_ERROR.log --trace 0 ${basename}`;

        // Ejecutar el primer comando y esperar a que termine
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error en el comando BIESC: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`Stderr en BIESC: ${stderr}`);
                return;
            }
            console.log("BIESC_______________________");
            console.log(`${stdout}`);

            // Ejecutar el segundo comando solo si el primero fue exitoso
            const result = spawnSync(commandVM, {
                cwd: vmPath,
                stdio: 'inherit',
                shell: true,
            });

            if (result.error) {
                console.error(`Error al ejecutar BIESVM: ${result.error.message}`);
            } else {
                console.log("BIESVM ejecutado con éxito.");
            }
        });
    });

program.parse();
