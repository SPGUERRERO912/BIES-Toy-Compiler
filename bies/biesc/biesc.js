import path from 'path';
import { Command } from 'commander';
import { exec, execSync } from 'child_process';

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
        // Comando 1: Ejecutar con inputPath y basename
        const command = `node index.js --o BIESC_OUT.log --e BIESC_ERROR.log ${inputPath} ${basename}`;
        //console.log("Comando para procesar entrada:", command);
        const commandVM = `node index.js --o BIESVM_OUT.log --e BIESVM_ERROR.log --trace 0 ${basename}`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`Stderr: ${stderr}`);
                return;
            }
            console.log(`BIESC_______________________`);
            console.log(`${stdout}`);
        });
        execSync(commandVM, { cwd: vmPath, stdio: 'inherit' });

     
    });

program.parse();
