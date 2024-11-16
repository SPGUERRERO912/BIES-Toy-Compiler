
import { Command } from 'commander';
import { exec }  from 'child_process';
import path from 'path';

const program = new Command();

program
    .name("biesc")
    .description("Automatiza la ejecución del comando BIESC")
    .argument("<biesFile>", "Nombre del archivo de entrada BIESC")
    .action((biesFile) => {
        // Construir rutas absolutas
        const inputPath = path.resolve("input", biesFile);
        const outputfile = path.basename(biesFile,'.bies');
        const basename = path.resolve("../biesvm/input", outputfile + ".basm");

        // Comando que deseas automatizar
        const command = `node index.js --o outfile.log --e errfile.log ${inputPath} ${basename}`;

        //console.log(`Ejecutando: ${command}`);

        // Ejecutar el comando
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`Stderr: ${stderr}`);
                return;
            }
            console.log(`Output\n${stdout}`);
        });
    });

program.parse();
