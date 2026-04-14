# BIES-Toy-Compiler
Durante el desarrollo del proyecto en Node.js, se utilizó el apoyo de ChatGPT como herramienta de consulta para la integración de utilidades clave como Jest, Lint y Prettier. Además, se empleó para obtener soporte en tareas relacionadas con el uso de la consola, gramática y para el diseño de funciones auxiliares que complementan las funcionalidades principales del evaluador. Finalmente, se aprovechó su capacidad como recurso de aprendizaje para comprender y aplicar algoritmos como el Shunting Yard de Dijkstra en el flujo del proyecto.
## Proceso de Build Automatizado Completo

1. Clona el repositorio y navega a la **raíz (bies)** del proyecto.
```bash
    cd bies
```
2. Ejecute el siguiente comando para llevar a cabo el proceso de build automatizado(este comando ejecutara el build de **BIESC** y **BIESVM**).
```bash
   npm run buildGlobal
```
3. Para la ejecución individual de un archivo **.bies**.
    - Hay que navegar a la ruta **biesc**:
    ```bash
    cd biesc
    ```
    - Y se ejecuta el comando:
    ```bash
    biesc file.bies
    ```

4. Para la ejecución individual de un archivo **.basm**.
    - Hay que navegar a la ruta **biesc**:
    ```bash
    cd biesvm
    ```
    - Y se ejecuta el comando:
    ```bash
    biesvm file.basm
    ```

 ### **Nota Importante:**
    - `BIESC_OUT`   =  Proporciona detalles acerca de la ejecución del bytecode en biesc.
    - `BIESC_ERROR` =  Proporciona detalles por si llegan a existir errores en biesc.
    - `BIESVM_OUT`  =  Proporciona el bytecode compilado en biesvm.
    - `BIESVM_ERROR`=  Proporciona detalles por si llegan a existir errores en biesvm.
