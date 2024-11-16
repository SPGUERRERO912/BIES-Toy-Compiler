import antlr4 from 'antlr4';
import BiesLexer from '../grammar/biescLexer.js';
import BiesParser from '../grammar/biescParser.js';
import BiesVisitor from '../grammar/biescVisitor.js';
import fs from 'fs';

/**
 *
 * @author Joel Ramirez, Sebastian Peñaranda, Marco Leandro
 * @version 1.0
 */

class BytecodeVisitor extends BiesVisitor {
  constructor() {
    super();
    this.bytecode = [{ identifier: 'main', code: [] }]; // Pila principal de bytecode
    this.functionCounter = 1;
    this.contextStack = []; // Para manejar los contextos
    this.variableMap = new Map(); // Mapa de variables
    this.variableCounter = 0; // Contador de variables
  }

  visitProgram(ctx) {
    this.bytecode[0].code.push(
      '; Author Joel Ramirez, Marco Leandro, Sebastian Peñaranda, Valentina Hernández',
    );
    this.bytecode[0].code.push('$FUN $0 args : 0 parent : $0');
    ctx.statement().forEach((statement) => {
      this.visit(statement);
    });
    this.bytecode[0].code.push('HLT ; finalización del programa');
    this.bytecode[0].code.push('$END $0');
    return this.unifyBytecode();
  }

  loadValue(valueNode) {
    const targetBytecode = this.getTargetBytecode();
    // Variable para almacenar el nodo transformado sin alterar el original
    const transformedNode =
      valueNode.ID &&
      !valueNode.expression &&
      valueNode.ID() &&
      valueNode.valueExpression
        ? valueNode.valueExpression().expression()
        : valueNode;
    // Realiza el registro y el push de BST si es una variable
    const registerAndPushBST = (node) => {
      if (node && node.ID && node.ID()) {
        const varName = node.ID().getText(); //extrae el "***"= 1 + 2
        targetBytecode.code.push(
          `BST 0 ${this.variableCounter} ; guardamos ${varName}`,
        );
        // Registrar en el mapa de variables
        this.variableMap.set(varName, this.variableCounter);
        this.variableCounter += 1;
      }
    };
    // Verifica si el nodo que se está evaluando ya existe en el mapa, entonces no tiene que agregarlo
    const checkIfNodeExistsInMap = (valueNode) =>
      Boolean(
        valueNode.ID?.() && this.variableMap.has(valueNode.ID().getText()),
      );

    const loaders = {
      INT: () => {
        const intValue = transformedNode.INT().getText();
        targetBytecode.code.push(`LDV ${intValue} ; cargar entero ${intValue}`);
      },
      FLOAT: () => {
        const floatValue = transformedNode.FLOAT().getText();
        targetBytecode.code.push(
          `LDV ${floatValue} ; cargar decimal ${floatValue}`,
        );
      },
      STRING: () => {
        const strValue = transformedNode.STRING().getText().slice(1, -1);
        targetBytecode.code.push(
          `LDV "${strValue}" ; cargar string "${strValue}"`,
        );
      },
      ID: () => {
        const varName = transformedNode.ID().getText();
        const getVarIndex = (name) =>
          this.variableMap.has(name) ? this.variableMap.get(name) : null;
        const buildVarBytecode = (varIndex) => {
          return `BLD ${
            this.getParentIndex() == 0
              ? this.getParentIndex()
              : targetBytecode.identifier.includes('LET-IN')
                ? 0
                : 1
          } ${varIndex} ; cargar ${varName}`;
        };
        const loadVarOrFunction = (varIndex) => {
          if (varIndex?.type === 'function') {
            return this.visitFunctionCall(transformedNode);
          }
          return targetBytecode.code.push(buildVarBytecode(varIndex));
        };
        return loadVarOrFunction(getVarIndex(varName));
      },
      EXPRESSION: () => this.visitValueExpression(transformedNode),
    };

    // Determinar el tipo basado en el nodo transformado y cargar el valor
    const type = transformedNode.INT
      ? 'INT'
      : transformedNode.FLOAT
        ? 'FLOAT'
        : transformedNode.STRING
          ? 'STRING'
          : transformedNode.ID
            ? 'ID'
            : transformedNode.expression
              ? 'EXPRESSION'
              : null;
    if (type && loaders[type]) {
      loaders[type]();
      /*Después de cargar el valor, registrar y hacer el push de BST si es necesario. ¿Como sé si es 
            necesario, checkIfNodeExistsInMap revisa que no haya sido ingresada antes ya que podría?*/
      registerAndPushBST(checkIfNodeExistsInMap(valueNode) ? null : valueNode);
    }
  }

  handleFunctionExpression(functionExprNode, varName) {
    /*Esta funcion se encarga de gestionar la creacion de una funcion, agrega el encabezado, crea el nuevo bytecode donde se van a ingresar las instrucciones,
        manda a evaluar sus statments, cierra la funcion y realiza el LDF desde donde debe ser invocada*/
    const newBytecode = { identifier: varName, code: [] };
    this.enterFunctionContext(varName);
    const functionNumber = this.functionCounter++;
    const argsCount = functionExprNode.ID() ? functionExprNode.ID().length : 0;
    newBytecode.code.push(
      `$FUN $${functionNumber} args : ${argsCount} parent : $${this.getParentIndex()}`,
    );
    newBytecode.identifier = varName;
    this.bytecode.push(newBytecode);
    if (functionExprNode.statement().expression()) {
      this.loadValue(functionExprNode.statement().expression());
    } else {
      this.visit(functionExprNode);
    }
    newBytecode.code.push(`RET ; Fin de la función`);
    newBytecode.code.push(`$END $${functionNumber}`);
    this.exitFunctionContext();
    const targetBytecode = this.getTargetBytecode(this.getParentIndex());
    targetBytecode.code.push(`LDF $${functionNumber}`);
  }

  visitVarDeclaration(ctx) {
    /*Gestiona la visita de una variable let, hay dos tipos let = y let {} in {}. No gestiona const = o const = let {} in {} porque los
        const son variables que solo pueden existir dentro de un bloque let in, esas son procesadas dentro del if utilizando processValue y
        registerFunctionIfExists*/
    const registerFunctionIfExists = (valueNode, varName) =>
      valueNode.expression?.().functionExpression &&
      this.variableMap.set(varName, {
        node: valueNode.expression().functionExpression(),
        type: 'function',
      });
    const processValue = (ctx) => {
      const valueNode = ctx.valueExpression();
      const varName = ctx.ID().getText();
      // Primero intenta registrar la función. Si no es función, llama a loadValue.
      registerFunctionIfExists(valueNode, varName) || this.loadValue(ctx);
    };
    if (ctx.getChild(1).getText() === '{') {
      const varName = `LET-IN${this.functionCounter}`; //como la funcion let in no tiene nombre, yo le generé un nombre para poder agregarla al map y rastrearla
      const constDeclarations = ctx.constDeclaration();
      const argsCount = constDeclarations.reduce(
        (accumulator) => accumulator + 1,
        0,
      );
      const newBytecode = { identifier: varName, code: [] };
      const functionNumber = this.functionCounter++;
      /*Aca no se hace uso del handleFunctionExpression porque al contener declaraciones const y statments
            handle no sabe como procesar, su estructura es bastante distinta a una funcion arrow convencional*/
      newBytecode.code.push(
        `$FUN $${functionNumber} args : ${argsCount} parent : $${this.getParentIndex()}`,
      );
      this.bytecode.push(newBytecode);
      newBytecode.identifier = varName;
      const targetBytecode = this.getTargetBytecode(); //getTargetBytecode nos trae el contexto donde debemos invocar el let in para cargarle el LDF y APP
      targetBytecode.code.push(`LDF $${functionNumber}`);
      targetBytecode.code.push(
        `APP ${argsCount} ; Ejecutamos let-in con ${argsCount} argumentos`,
      );
      this.enterFunctionContext(varName);
      constDeclarations.forEach((constCtx) => {
        //se visitan sus let {***}
        processValue(constCtx);
      });
      const constStatements = ctx.statement(); //se visitan sus in {***}
      constStatements.forEach((constCtx) => {
        this.visit(constCtx);
      });
      newBytecode.code.push(`RET ; Fin de la función`);
      newBytecode.code.push(`$END $${functionNumber}`);
      this.exitFunctionContext();
    } else {
      processValue(ctx); //si es let convencional solo lo procesamos
    }
    return null;
  }

  visitValueExpression(ctx) {
    const targetBytecode = this.getTargetBytecode();
    const determineOperation = (leftType, rightType, operation) => {
      const operationMap = {
        '+': {
          INT: 'ADD ; Sumar entero',
          FLOAT: 'ADD ; Sumar decimal',
          STRING: 'CAT ; Concatenar cadenas',
        },
        '-': { INT: 'SUB ; Restar', FLOAT: 'SUB ; Restar' },
        '*': { INT: 'MUL ; Multiplicar', FLOAT: 'MUL ; Multiplicar' },
        '/': { INT: 'DIV ; Dividir', FLOAT: 'DIV ; Dividir' },
        '**': { INT: 'POW ; Potenciar', FLOAT: 'POW ; Potenciar' },
      };

      return (
        operationMap[operation]?.[leftType] ||
        operationMap[operation]?.[rightType] ||
        null
      );
    };

    const processExpression = (expr) => {
      if (!expr) {
        //console.log("Expresión es null o undefined");
        return null;
      }

      // Si la expresión está entre paréntesis, procesamos su contenido interno.
      if (
        expr.children &&
        expr.children[0].getText() === '(' &&
        expr.children[expr.children.length - 1].getText() === ')'
      ) {
        //console.log("Eliminando paréntesis de la expresión:", expr.getText());
        return processExpression(expr.children[1]); // Procesamos el contenido sin los paréntesis externos
      }

      if (expr.children && expr.children.length > 1) {
        //console.log("Procesando expresión con hijos:", expr.getText());
        //console.log("Es una operación binaria");
        const left = processExpression(expr.children[0]);
        const operator = expr.children[1];
        const right = processExpression(expr.children[2]);
        ///console.log("Operando izquierdo:", left);
        //console.log("Operador:", operator.getText());
        //console.log("Operando derecho:", right);

        if (!left || !right) {
          //console.log("Error en la operación binaria: uno de los operandos es null");
          return null;
        }
        const leftType = left.type;
        const rightType = right.type;
        // console.log("Tipo de los operandos:", leftType, rightType);
        if (leftType === 'UNKNOWN' || rightType === 'UNKNOWN') {
          //console.log("Error: uno de los operandos tiene tipo UNKNOWN");
          return null;
        }
        const bytecodeOperation = determineOperation(
          leftType,
          rightType,
          operator.getText(),
        );
        if (bytecodeOperation) {
          //console.log("Bytecode de la operación:", bytecodeOperation);
          targetBytecode.code.push(bytecodeOperation);
        } else {
          //console.log("Operación no soportada entre los tipos:", leftType, rightType);
          return null;
        }
        return {
          value: left.value + ' ' + operator.getText() + ' ' + right.value,
          type: leftType,
        };
      }

      //console.log("Valor literal o identificador:", expr.getText());
      const literalValue = expr.getText();
      this.loadValue(expr);

      // Determinar el tipo básico para literales y devolver un objeto con tipo y valor
      const type = isNaN(literalValue)
        ? 'STRING'
        : literalValue.includes('.')
          ? 'FLOAT'
          : 'INT';
      return { value: literalValue, type: type };
    };
    // Comenzamos el procesamiento desde el contexto de la expresión
    const result = processExpression(ctx);
    // Si la expresión es válida, se imprime
    if (result !== null) {
      //console.log("Expresión procesada:", result);
    } else {
      //console.log("Error en la expresión: expresión no válida o no soportada.");
    }
  }

  visitPrintStatement(ctx) {
    /*printArg evalua el contenido del print ya que puede ser una expresion "hola + 123" o una funcion loriaPendejo()*/
    const printArg = ctx.printArgument().expression()
      ? ctx.printArgument().expression()
      : ctx.printArgument().functionCall();
    const getIndex = () =>
      ctx.printArgument().functionCall()
        ? this.getParentIndex()
        : null; /*si es una funcion, el bytecode cambia de contexto a esa funcion
        pero el print debe permacener en lo que ahora es su "Parent" por ende, se realiza esa evaluacion y el print es cargado con un Index del Parent*/
    this.loadValue(printArg); // Carga el valor utilizando loadValue
    const targetBytecode = this.getTargetBytecode(getIndex());
    targetBytecode.code.push('PRN ; print valor cargado');
    return null;
  }

  visitFunctionCall(ctx) {
    const functionName = ctx.ID().getText(); //nombre de la funcion
    this.enterFunctionContext(functionName); //cambiamos de contexto
    const args = ctx.expression();
    const functionData = this.variableMap.get(functionName);
    if (!functionData || functionData.type !== 'function') {
      throw new Error(`${functionName} no es una función válida`);
    }

    const params = functionData.node.ID();
    const argsCount = params ? params.length : 0; //extraigo los parametros de la funcion

    if (argsCount !== args.length) {
      throw new Error(
        `La cantidad de argumentos para la función ${functionName} no coincide`,
      );
    }
    /*Como la declaracion de una funcion no genera bytecode si no nada mas el registro en el variableMap. Al hacer el call es cuando ingreso el bytecode, si tiene
        parametros como (x, p), el bytecode no es ingresado con x y p, si no que reemplazo el identificador "x/p" por los valores asignados en el call de la funcion
        en este caso args posee el o los valores*/
    params.forEach((paramNode, index) => {
      const paramId = paramNode.getText();
      const argValue = args[index];
      this.replaceIdentifier(functionData.node, paramId, argValue);
    });
    this.exitFunctionContext(); //cambiamos de contexto, retornamos al anterior
    this.handleFunctionExpression(functionData.node, functionName);
    const targetBytecode = this.getTargetBytecode(this.getParentIndex());
    targetBytecode.code.push(
      `APP ${args.length} ; Ejecutamos ${functionName} con ${args.length} argumentos`,
    ); //al llamarse handle, handle realiza el LDF
    return null;
  }

  /*Funciones auxiliares de soporte para los metodos principales, ninguna interactua directamente con los ctx*/

  enterFunctionContext(funcName) {
    const parentContext = this.getCurrentContext();
    this.contextStack.push({
      funcName,
      parent: parentContext ? parentContext.funcName : null,
    });
  }

  exitFunctionContext() {
    this.contextStack.pop();
  }

  getCurrentContext() {
    return this.contextStack.length > 0
      ? this.contextStack[this.contextStack.length - 1]
      : null;
  }

  getTargetBytecode(bytecodeIndex = null) {
    return bytecodeIndex !== null
      ? this.bytecode[bytecodeIndex]
      : this.getCurrentContext()
        ? this.bytecode[this.bytecode.length - 1]
        : this.bytecode[0];
  }

  getParentIndex = () => {
    // Obtener el último elemento del contexto
    const lastContext = this.contextStack[this.contextStack.length - 1];

    // Si funcName contiene 'LET-IN', buscar el índice de identifier
    if (lastContext?.funcName?.includes('LET-IN')) {
      const identifier = lastContext.funcName;
      return this.bytecode.findIndex(({ identifier: id }) => id === identifier);
    }

    // Si no se cumple la condición, buscar el índice usando parent
    const parentIdentifier = lastContext?.parent;
    return this.bytecode.findIndex(
      ({ identifier }) => identifier === parentIdentifier,
    ) === -1
      ? 0
      : this.bytecode.findIndex(
          ({ identifier }) => identifier === parentIdentifier,
        );
  };

  replaceIdentifier(node, paramId, argValue) {
    if (!node) return null;
    const isTargetNode = node.ID && node.getText() === paramId;
    if (isTargetNode) return argValue;
    if (node.children) {
      node.children = node.children.map(
        (child) => this.replaceIdentifier(child, paramId, argValue) || child,
      );
    }
    return node;
  }

  getType(node) {
    if (node.INT) return 'INT';
    if (node.FLOAT) return 'FLOAT';
    if (node.STRING) return 'STRING';
    if (node.ID) return 'ID';
    return 'UNKNOWN';
  }

  unifyBytecode() {
    const unified = this.bytecode
      .map((pila) => pila.code.join('\n')) // Une cada array `code` en un solo string
      .join('\n'); // Une todas las pilas respetando el orden
    return unified;
  }
}

function generateBytecode(inputFile, outputFile) {
  const input = new antlr4.FileStream(inputFile);
  const lexer = new BiesLexer(input);
  const tokens = new antlr4.CommonTokenStream(lexer);
  const parser = new BiesParser(tokens);
  const tree = parser.program();
  const visitor = new BytecodeVisitor();
  const bytecode = visitor.visit(tree);
  fs.writeFileSync(outputFile, bytecode, 'utf-8');
}

export default generateBytecode;
