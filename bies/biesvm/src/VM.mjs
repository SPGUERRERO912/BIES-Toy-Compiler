import { ContextHandler } from './contextHandler.mjs';
import { ContextLoader } from './contextLoader.mjs';

export class VM {
  constructor() {
    this.register = []; //S
    this.environment = [Array.from({ length: 10 }, () => [])]; // B
    this.environment[0].identifier = '$0';
    this.functions = {}; // Guardar las funciones por nombre                    //C
    this.callStack = []; // Pila para manejar el retorno de funciones           //D
    this.currentFunction = null;
    this.contextHandler = new ContextHandler(this);
    this.contextLoader = new ContextLoader(this, this.contextHandler);
    this.halted = false; // Flag para verificar si la VM ha sido detenida
    this.programCounter = 0;
  }

  execute(instruction) {
    if (this.halted) return; // Detener ejecución si ya se ha llamado HLT
    const parts = instruction.split(' ');
    const actions = new Map([
      [
        'LDV',
        () => {
          // const value = parts[1]; // Obtener el valor después de LDV
          const value = instruction.slice(4).trim();
          // Verificar si el valor es un número con signo
          const isSignedNumber = /^[-+]?\d+$/.test(value); // Detectar enteros con signo (positivo o negativo)
          const isMathConst = /Math/.test(value);
          if (isSignedNumber) {
            // Es un número con signo, convertirlo a entero
            const num = parseInt(value, 10);
            this.register.push(num);
          } else if (isMathConst) {
            const constValue = value.split('.')[1];
            const valToInsert = new Map([
              ['pi', () => this.register.push(Math.PI)],
              ['euNum', () => this.register.push(Math.E)],
              ['euConst', () => this.register.push(0.57721)],
              ['phi', () => this.register.push(1.61803)],
            ]);

            valToInsert.has(constValue) && valToInsert.get(constValue)();
          } else if (value.startsWith('"') && value.endsWith('"')) {
            // Es una cadena, remover comillas si es necesario
            const str = value.replace(/^"|"$/g, ''); // Remover comillas dobles
            this.register.push(str);
          } else {
            // Si no es ni número ni cadena, asumimos que es una lista
            const valueArr = value
              ? value.split(',').map((item) => {
                  const trimmed = item.trim();
                  return !isNaN(trimmed) && trimmed !== ''
                    ? Number(trimmed)
                    : trimmed;
                })
              : [];
            this.register.push(valueArr);
          }
        },
      ],
      ['LDF', () => this.register.push(parts[1])],
      ['POP', () => this.register.pop()],
      [
        'SWP',
        () => {
          const n = this.register.pop(); // Sacar el valor N del registro
          const m = this.register.pop(); // Sacar el valor M del registro
          this.register.push(n); // Insertar N en el registro
          this.register.push(m); // Insertar M en el registro (cambiando de orden)
        },
      ],
      [
        'BST',
        () =>
          (this.environment[parseInt(parts[1], 10)][parseInt(parts[2], 10)] =
            this.register.pop()),
      ],
      [
        'BLD',
        () => {
          const [envIndex, valueIndex] = [
            parseInt(parts[1], 10),
            parseInt(parts[2], 10),
          ];
          const value = this.environment[envIndex][valueIndex];
          this.register.push(value);
        },
      ],
      [
        'ADD',
        () => this.register.push(this.register.pop() + this.register.pop()),
      ],
      [
        'MUL',
        () => this.register.push(this.register.pop() * this.register.pop()),
      ],
      [
        'DIV',
        () => this.register.push(this.register.shift() / this.register.pop()),
      ],
      [
        'SUB',
        () => this.register.push(this.register.shift() - this.register.pop()),
      ],
      ['NEG', () => this.register.push(-this.register.pop())],
      [
        'SGN',
        () =>
          this.register.pop() > 0
            ? this.register.push(1)
            : this.register.push(0),
      ],
      [
        'NEQ',
        () => {
          this.register.push(
            this.register.pop() !== this.register.pop() ? 1 : 0,
          );
        },
      ],
      [
        'EQ',
        () => {
          this.register.push(
            this.register.pop() === this.register.pop() ? 1 : 0,
          );
        },
      ],
      [
        'GT',
        () =>
          this.register.push(
            this.register.shift() > this.register.pop() ? 1 : 0,
          ),
      ],
      [
        'GTE',
        () =>
          this.register.push(
            this.register.shift() - 1 >= this.register.pop() ? 1 : 0,
          ),
      ],
      [
        'LT',
        () =>
          this.register.push(
            this.register.shift() < this.register.pop() ? 1 : 0,
          ),
      ],
      [
        'LTE',
        () =>
          this.register.push(
            this.register.shift() <= this.register.pop() ? 1 : 0,
          ),
      ],
      [
        'AND',
        () =>
          this.register.push(
            this.register.pop() && this.register.pop() ? 1 : 0,
          ),
      ],
      [
        'OR',
        () =>
          this.register.push(
            this.register.pop() || this.register.pop() ? 1 : 0,
          ),
      ],
      [
        'XOR',
        () => {
          const n = this.register.pop();
          const m = this.register.pop();
          this.register.push((n ? !m : m) ? 1 : 0);
        },
      ],
      ['NOT', () => this.register.push(!this.register.pop() ? 1 : 0)],
      [
        'SNT',
        () => {
          this.register.push(
            typeof this.register.pop() === 'string' &&
              this.register.pop() === undefined
              ? 1
              : 0,
          );
        },
      ],
      [
        'STK',
        () => {
          const k = this.register.pop();
          const str = this.register.pop();
          if (typeof str === 'string' && typeof k === 'number') {
            if (k >= 0 && k < str.length) {
              this.register.push(str[k]);
            }
          }
        },
      ],
      [
        'SRK',
        () => {
          const k = this.register.pop() + 1;
          const str = this.register.pop();
          if (typeof str === 'string' && typeof k === 'number') {
            if (k >= 0 && k <= str.length) {
              this.register.push(str.slice(k));
            } else {
              throw new Error('SRK: Índice fuera de rango.');
            }
          } else {
            throw new Error('SRK: K no es un número o V no es un string.');
          }
        },
      ],
      [
        'CAT',
        () => {
          this.register.push(
            `${this.register.shift() + ' ' + this.register.pop()}`,
          );
        },
      ],
      ['TOS', () => this.register.push(`"${this.register.pop().toString()}"`)],
      [
        'LNT',
        () => {
          const v = this.register.pop();
          this.register.push(v === undefined ? 1 : 0);
        },
      ],
      [
        'LIN',
        () => {
          const v = this.register.pop(); // Luego obtener el valor
          const list = this.register.pop(); // Obtener la lista primero
          if (Array.isArray(list)) {
            list.unshift(v);
            this.register.push(list);
          } else {
            console.error('LIN: El valor no es una lista, valor actual:', list); // Imprimir error con más información
            throw new Error('LIN: El valor no es una lista.');
          }
        },
      ],
      [
        'LTK',
        () => {
          const k = this.register.pop();
          const list = this.register.pop();
          if (Array.isArray(list) && typeof k === 'number') {
            if (k >= 0 && k < list.length) {
              this.register.push(list[k]);
            }
          }
        },
      ],
      [
        'LRK',
        () => {
          const k = this.register.pop() + 1; // + 1 for slice to properly work
          const list = this.register.pop();
          if (Array.isArray(list) && typeof k === 'number') {
            if (k >= 0 && k < list.length) {
              this.register.push(list.slice(k));
            } else {
              throw new Error('LRK: Índice fuera de rango.');
            }
          } else {
            throw new Error('LRK: K no es un número o V no es una lista.');
          }
        },
      ],
      [
        'TOL',
        () => {
          const v = this.register.pop();
          if (Array.isArray(v)) {
            this.register.push(v);
          } else {
            const resArr = isNaN(v)
              ? Array.from(v)
              : Array.from(String(v)).map(Number);
            this.register.push(resArr);
          }
        },
      ],
      [
        'APP',
        () => {
          this.programCounter++;
          const functionName = this.register.pop();
          this.callStack.push({
            parent: this.functions[functionName].parent,
            args: parts[1],
          });
          this.contextLoader.loadFunction(functionName);
          this.programCounter = 0;
        },
      ],
      ['PRN', () => console.log(this.register.pop())],
      ['HLT', () => (this.halted = true)],
      [
        '$FUN',
        () => {
          this.currentFunction = parts[1];
          this.functions[this.currentFunction] = {
            instructions: [],
            parent: parts[7],
          };
        },
      ],
      ['$END', () => (this.currentFunction = null)],
      [
        'RET',
        () => {
          const callFrame = this.callStack.pop();
          const parentFunction = callFrame?.parent;
          if (parentFunction) {
            this.contextLoader.returnFromFunction(parentFunction);
            this.currentFunction = null;
          } else {
            console.log('No hay más funciones a las que retornar. VM HALTED.');
            this.halted = true; // Detener la VM si no hay más funciones a las que retornar
          }
        },
      ],
      [
        'CST',
        () => {
          const valToCast = this.register.pop();
          if (parts[1] === 'string') {
            this.register.push(
              Array.isArray(valToCast)
                ? valToCast.toString()
                : String(valToCast),
            );
          } else if (parts[1] === 'list') {
            this.register.push(
              isNaN(valToCast)
                ? Array.from(valToCast)
                : Array.from(String(valToCast)).map(Number),
            );
          } else {
            const auxCast = Array.isArray(valToCast)
              ? valToCast
              : Number(valToCast);
            isNaN(auxCast)
              ? (() => {
                  throw new Error('Cannot cast array or chars to number');
                })()
              : this.register.push(auxCast);
          }
        },
      ],
      [
        'INO',
        () => {
          const currVal = this.register.pop();
          this.register.push(
            parts[1] === 'list'
              ? Array.isArray(currVal)
              : typeof currVal == parts[1],
          );
        },
      ],
      [
        'BR',
        () => {
          const sign = parts[1].charAt(0);
          const offset = parseInt(parts[1].slice(1), 10);
          this.programCounter += sign === '+' ? offset : -offset;
          this.jumpOccurred = true; // Marcar que ocurrió un salto
        },
      ],
      [
        'BT',
        () => {
          const condition = this.register.pop(); // Recupera el valor del registro
          if (condition === 1 || condition === true) {
            const sign = parts[1].charAt(0);
            const offset = parseInt(parts[1].slice(1), 10);
            this.programCounter += sign === '+' ? offset : -offset;
            this.jumpOccurred = true; // Marcar que ocurrió un salto
          }
        },
      ],
      [
        'BF',
        () => {
          const condition = this.register.pop(); // Recupera el valor del registro
          if (condition === 0 || condition === false) {
            const sign = parts[1].charAt(0);
            const offset = parseInt(parts[1].slice(1), 10);
            this.programCounter += sign === '+' ? offset : -offset;
            this.jumpOccurred = true; // Marcar que ocurrió un salto
          }
        },
      ],
      [
        'INI',
        () => {
          const functionName = parts[1];
          if (this.functions[functionName]) {
            this.register = [];
            this.environment = [Array.from({ length: 10 }, () => [])];
            this.callStack = [];
            this.currentFunction = functionName;

            this.contextHandler.current = functionName;
            this.run(this.functions[functionName].instructions);
          } else {
            throw new Error(`Función ${functionName} no encontrada.`);
          }
        },
      ],
      [
        'NOP',
        () => {
          return undefined;
        },
      ],
    ]);

    const action = actions.get(parts[0]);
    if (action) {
      if (this.currentFunction && parts[0] !== '$FUN' && parts[0] !== '$END') {
        this.functions[this.currentFunction].instructions.push(instruction);
      } else {
        action();
      }
    }
  }

  *instructionGenerator(instructions, startCounter = 0) {
    for (let counter = startCounter; counter < instructions.length; counter++) {
      yield { index: counter, instruction: instructions[counter] };
    }
  }

  run(instructions) {
    const checkFunctionBounds = (instructions) =>
      ['$FUN', '$END'].every((keyword) => instructions.includes(keyword));
    let instructionIterator = this.instructionGenerator(
      instructions,
      this.programCounter,
    );
    let result = instructionIterator.next();
    while (!result.done) {
      const { index, instruction } = result.value;
      this.programCounter = index;
      this.execute(instruction);
      if (this.halted) break;
      this.programCounter =
        !checkFunctionBounds(instructions) &&
        instructions.isLoaded !== true &&
        !this.jumpOccurred
          ? 0
          : this.programCounter;
      if (this.jumpOccurred) {
        instructionIterator = this.instructionGenerator(
          instructions,
          this.programCounter + 1,
        );
        this.jumpOccurred = false;
      }
      result = instructionIterator.next();
    }
    if (!this.halted && this.functions['$0'] && this.currentFunction === null) {
      this.run(this.functions['$0'].instructions);
    } else if (!this.halted && !this.currentFunction) {
      console.error('No se encontró la función principal $0');
    }
  }
}
