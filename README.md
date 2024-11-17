# EIF400 II 2024 BIESVM-BIESC 05-3:00 PM - Joel Ramirez Vargas
### Integrantes del grupo 05 NRC 50994
- Joel Ramírez Vargas 119020788 [Coordinador]
- Marco Leandro Chacón 118510803
- Sebastián Peñaranda Guerrero 118440262

Se utilizó apoyo de ChatGPT para la construcción del proyecto en Node.js, específicamente para integrar herramientas como Jest, Lint y Prettier. Además, de para obtener soporte en tareas relacionadas con la consola.
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
    - **Nota Importante:**
    - `BIESC_OUT` :    Proporciona detalles acerca de la ejecución del bytecode.
    - `BIESC_ERROR` :  Proporciona detalles por si llegan a existir errores.
    - `BIESVM_OUT` :   Proporciona el bytecode compilado.
    - `BIESVM_ERROR` : Proporciona detalles por si llegan a existir errores.

4. Para la ejecución individual de un archivo **.basm**.
    - Hay que navegar a la ruta **biesc**:
    ```bash
    cd biesvm
    ```
    - Y se ejecuta el comando:
    ```bash
    biesvm file.basm
    ```