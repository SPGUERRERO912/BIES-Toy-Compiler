import antlr4 from 'antlr4';
import BiesLexer from '../grammar/biescLexer.js';
import BiesParser from '../grammar/biescParser.js';
import BiesVisitor from '../grammar/biescVisitor.js';
import fs from 'fs';

class BytecodeVisitor extends BiesVisitor {
    constructor() {
        super();
        this.bytecode = [{ identifier: "main", code: [] }]; // Pila principal de bytecode
        this.functionCounter = 1;
        this.contextStack = []; // Para manejar los contextos
        this.variableMap = new Map(); // Mapa de variables
        this.variableCounter = 0; // Contador de variables
    }

    visitProgram(ctx) {
        this.bytecode[0].code.push("; Author Joel Ramirez, Marco Leandro, Sebastian Peñaranda, Valentina Hernández");
        this.bytecode[0].code.push("$FUN $0 args : 0 parent : $0");
        ctx.statement().forEach(statement => {
            this.visit(statement);
        });
        this.bytecode[0].code.push("HLT ; finalización del programa");
        this.bytecode[0].code.push("$END $0");
        return this.unifyBytecode();
    }

    loadValue(valueNode) {
        const targetBytecode = this.getTargetBytecode()
        // Variable para almacenar el nodo transformado sin alterar el original
        const transformedNode = (valueNode.ID && !valueNode.expression && valueNode.ID() && valueNode.valueExpression) 
            ? valueNode.valueExpression().arrayLiteral()
            ? valueNode.valueExpression()
            : valueNode.valueExpression().expression()
            : valueNode;
        // Realiza el registro y el push de BST si es una variable
        const registerAndPushBST = (node) => {
            if (node && node.ID && node.ID()) {
                const varName = node.ID().getText(); //extrae el "***"= 1 + 2
                targetBytecode.code.push(`BST 0 ${this.variableCounter} ; guardamos ${varName}`);
                this.variableMap.set(varName, [this.variableCounter, node.valueExpression()]);
                this.variableCounter += 1;
            }
        };
        // Verifica si el nodo que se está evaluando ya existe en el mapa, entonces no tiene que agregarlo
        const checkIfNodeExistsInMap = (valueNode) => 
            Boolean(valueNode.ID?.() && this.variableMap.has(valueNode.ID().getText()));
    
        const loaders = {
            INT: () => {
                const intValue = transformedNode.INT 
                                ? transformedNode.INT().getText() 
                                : transformedNode.getText() ;
                targetBytecode.code.push(`LDV ${intValue} ; cargar entero ${intValue}`);
            },
            FLOAT: () => {
                const floatValue = transformedNode.FLOAT().getText();
                targetBytecode.code.push(`LDV ${floatValue} ; cargar decimal ${floatValue}`);
            },
            STRING: () => {
                const strValue = transformedNode.STRING().getText().slice(1, -1);
                targetBytecode.code.push(`LDV "${strValue}" ; cargar string "${strValue}"`);
            },
            ID: () => {
                const varName = transformedNode.ID 
                                ? transformedNode.ID().getText() 
                                : transformedNode.primary().ID().getText();

                const getVarIndex = (name) => this.variableMap.has(name) ? this.variableMap.get(name) : null;
                const buildVarBytecode = (varIndex) => {
                    return `BLD ${((this.getParentIndex() == 0 && !this.contextStack) || targetBytecode.identifier == 'main') 
                        ? this.getParentIndex() 
                        : targetBytecode.identifier.includes('LET-IN') 
                        ? 0 : 1} ${varIndex[0]} ; cargar ${varName}`;
                };
                const loadVarOrFunction = (varIndex) => {
                    if (varIndex?.type === "function") {
                        return this.visitFunctionCall(transformedNode);
                    }
                    return targetBytecode.code.push(buildVarBytecode(varIndex));
                };
                loadVarOrFunction(getVarIndex(varName));
                if (transformedNode.getChild(2)) {
                    const expressionNode = transformedNode.getChild(2);
                    if(expressionNode.expression) {
                        this.visitValueExpression(expressionNode)
                    } else if(expressionNode.children?.length) {
                        this.loadValue(expressionNode.children[0])
                    } else return
                    if (transformedNode.getText().includes('[')) {
                        targetBytecode.code.push("LTK ; extraer valor de la lista");
                    }
                } 
            },
            BRANCH_STATEMENT: () => {
                this.visit(transformedNode)
            },
            LIST: () => {
                const list = transformedNode.getText()
                targetBytecode.code.push(`LDV ${list} ; cargar lista ${list}`);
            },
            EXPRESSION: () => this.visitValueExpression(transformedNode)
        };

        // Determinar el tipo basado en el nodo transformado y cargar el valor
        const type = transformedNode.INT ? "INT" :
            transformedNode.ID || transformedNode.primary ? "ID" :
            transformedNode.FLOAT ? "FLOAT" :
            transformedNode.STRING ? "STRING" :
           
            transformedNode.arrayLiteral ? "LIST" :
            transformedNode.getText && transformedNode.getText().includes('if') ? "BRANCH_STATEMENT" :
            transformedNode.expression ? "EXPRESSION" :
            (() => { 
                const index = parseInt(transformedNode.getText(), 10);
                if (Number.isInteger(index)) {
                    return "INT";
                }
                return null; // Ningún tipo identificado
            })();
        if (type && loaders[type]) {
            loaders[type]();
            /*Después de cargar el valor, registrar y hacer el push de BST si es necesario. ¿Como sé si es 
            necesario, checkIfNodeExistsInMap revisa que no haya sido ingresada antes ya que podría?*/
            registerAndPushBST(checkIfNodeExistsInMap(valueNode) ? null : valueNode);
        }
    }

    handleFunctionExpression(node, varName) {
        /*Esta funcion se encarga de gestionar la creacion de una funcion, agrega el encabezado, crea el nuevo bytecode donde se van a ingresar las instrucciones,
        manda a evaluar sus statments, cierra la funcion y realiza el LDF desde donde debe ser invocada*/
        const bodyStatement = node.statement 
                            ? node.statement() 
                            : node.functionExpression().statement().expression()
        const newBytecode = { identifier: varName, code: [] };
        const functionNumber = this.functionCounter;
        // Verificación de "let" y configuración de contexto
        const isSingleStatement = !bodyStatement.getText().startsWith("let");
        const setupFunctionContext = () => {
            const argsCount = node.ID 
                            ? node.ID().length 
                            : node.functionExpression().ID().length ? 0
                            : 0
            newBytecode.code.push(`$FUN $${functionNumber} args : ${argsCount} parent : $${this.getParentIndex()}`);
            this.enterFunctionContext(varName);
            this.bytecode.push(newBytecode);
        };

        // Generación del código de retorno y finalización de contexto
        const finalizeFunctionContext = () => {
            newBytecode.code.push(`RET ; Fin de la función`);
            newBytecode.code.push(`$END $${functionNumber}`);
            this.exitFunctionContext();
            this.getTargetBytecode(this.getParentIndex()).code.push(`LDF $${functionNumber}`);
            this.functionCounter++;
        };

        // Inicia el contexto de función si es necesario
        isSingleStatement && setupFunctionContext();
        // Evalúa el cuerpo de la función
        const expressionNode = node.statement? node.statement().expression() : node.functionExpression().statement().expression();
        expressionNode ? this.loadValue(expressionNode) : this.visit(node);
        // Finaliza el contexto de función si es necesario
        isSingleStatement && finalizeFunctionContext();
    }

    visitVarDeclaration(ctx) {
        /*Gestiona la visita de una variable let, hay dos tipos let = y let {} in {}. No gestiona const = o const = let {} in {} porque los
        const son variables que solo pueden existir dentro de un bloque let in, esas son procesadas dentro del if utilizando processValue y
        registerFunctionIfExists*/
        const registerFunctionIfExists = (valueNode, varName) => {
            const countNestedLambdas = (node) => {
                let count = 0;
                let ids = [];
                while (node && node.functionExpression) {
                    const innerExpression = node.functionExpression().statement().expression(0);
                    const currentIds = [];
                    node.functionExpression().children.forEach(child => {
                        if (child.symbol && child.symbol.type === BiesParser.ID) {
                            currentIds.push(child.getText());
                        }
                    });
                    ids.push(currentIds); // Guardamos los IDs actuales
            
                    if (innerExpression) count++; // Incrementamos el contador de lambdas anidadas
            
                    // Verificamos si hay una lambda anidada y actualizamos el nodo
                    if (innerExpression && innerExpression.functionExpression) {
                        node = innerExpression;
                    } else {
                        break; // Salimos si ya no hay otra lambda
                    }
                }
                return { count, ids };
            };
        
            const { count: lambdaDepth, ids: lambdaIds } = countNestedLambdas(valueNode.expression());
            if (lambdaDepth > 1) {
                this.variableMap.set(varName, { 
                    node: valueNode.expression(), 
                    type: 'nestedLambda', 
                    lambdaDepth: lambdaDepth,
                    lambdaIds: lambdaIds // Guardamos todos los IDs en cada nivel de anidación
                });
                return true; // Indicamos que se registró una lambda anidada
            } else if (valueNode.expression?.()?.functionExpression) {
                this.variableMap.set(varName, { 
                    node: valueNode.expression().functionExpression(), 
                    type: 'function',
                });
                return true; // Indicamos que se registró una función
            }
            return false; // Indicamos que no se registró ninguna función
        };
        const processValue = (ctx) => {
            const valueNode = ctx.valueExpression(); 
            const varName = ctx.ID().getText();
            // Primero intenta registrar la función. Si no es función, llama a loadValue.
            registerFunctionIfExists(valueNode, varName) || this.loadValue(ctx);
        };
        if (ctx.getChild(1).getText() === '{') {
            const varName = `LET-IN${this.functionCounter}`; //como la funcion let in no tiene nombre, yo le generé un nombre para poder agregarla al map y rastrearla
            const constDeclarations = ctx.constDeclaration();
            const argsCount = constDeclarations.reduce((accumulator) => accumulator + 1, 0);
            const newBytecode = { identifier: varName, code: [] };
            const functionNumber = this.functionCounter++
            /*Aca no se hace uso del handleFunctionExpression porque al contener declaraciones const y statments
            handle no sabe como procesar, su estructura es bastante distinta a una funcion arrow convencional*/
            newBytecode.code.push(`$FUN $${functionNumber} args : ${argsCount} parent : $${this.getParentIndex()}`);
            this.bytecode.push(newBytecode);
            newBytecode.identifier = varName;
            const targetBytecode = this.contextStack ? this.getTargetBytecode(this.getParentIndex()) : this.getTargetBytecode(); //getTargetBytecode nos trae el contexto donde debemos invocar el let in para cargarle el LDF y APP
            targetBytecode.code.push(`LDF $${functionNumber}`);
            targetBytecode.code.push(`APP ${argsCount} ; Ejecutamos let-in con ${argsCount} argumentos`)
            this.enterFunctionContext(varName);
            constDeclarations.forEach(constCtx => { //se visitan sus let {***}
                processValue(constCtx);
            });
            const constStatements = ctx.statement(); //se visitan sus in {***}
            constStatements.forEach(constCtx => {
                this.visit(constCtx)
            });
            newBytecode.code.push(`RET ; Fin de la función`);
            newBytecode.code.push(`$END $${functionNumber}`);
            this.exitFunctionContext()
        } else {
            processValue(ctx); //si es let convencional solo lo procesamos
        }
        return null;
    }
    
    visitPrintStatement(ctx) {
        /*printArg evalua el contenido del print ya que puede ser una expresion "hola + 123" o una funcion loriaPendejo()*/
        const printArg = ctx.printArgument().expression() ? ctx.printArgument().expression() : ctx.printArgument().functionCall()
        const getIndex = () => 
            ctx.printArgument().functionCall() ? this.getParentIndex() : null; /*si es una funcion, el bytecode cambia de contexto a esa funcion
        pero el print debe permacener en lo que ahora es su "Parent" por ende, se realiza esa evaluacion y el print es cargado con un Index del Parent*/
        this.loadValue(printArg); // Carga el valor utilizando loadValue 
        const targetBytecode = this.getTargetBytecode(getIndex())
        targetBytecode.code.push("PRN ; print valor cargado");
        return null;
    }

    visitFunctionCall(ctx) {
        const functionName = ctx.ID().getText(); //nombre de la funcion
        this.enterFunctionContext(functionName) //cambiamos de contexto 
        const args = ctx.expression();
        const functionData = this.variableMap.get(functionName);
        if (!functionData || (functionData?.type !== 'function' && functionData?.type !== 'nestedLambda')) {
            throw new Error(`${functionName} no es una función válida`);
        }
        const params = functionData.lambdaDepth 
                        ? functionData.lambdaDepth 
                        : functionData.node.ID();
        const argsCount = params 
                        ? functionData.lambdaDepth 
                        ? functionData.lambdaDepth + 1 
                        : params.length : 0; //extraigo los parametros de la funcion
        if (argsCount !== args.length) {
            throw new Error(`La cantidad de argumentos para la función ${functionName} no coincide`);
        }
        /*Como la declaracion de una funcion no genera bytecode si no nada mas el registro en el variableMap. Al hacer el call es cuando ingreso el bytecode, si tiene
        parametros como (x, p), el bytecode no es ingresado con x y p, si no que reemplazo el identificador "x/p" por los valores asignados en el call de la funcion
        en este caso args posee el o los valores*/
        if (functionData.type == 'function') {
            params.forEach((paramNode, index) => {
                const paramId = paramNode.getText();
                const argValue = args[index];
                this.replaceIdentifier(functionData.node, paramId, argValue);
            });
        } else if (functionData.type === 'nestedLambda') {
            functionData.lambdaIds.forEach((idList) => {
                idList.forEach((id, index) => {
                    const argValue = args[index];
                    this.replaceIdentifier(functionData.node.functionExpression().statement().expression(), id, argValue);
                });
            });
        }

        this.exitFunctionContext() //cambiamos de contexto, retornamos al anterior 
        this.handleFunctionExpression(functionData.node, functionName);
        const bodyStatement =  functionData.node.statement ? functionData.node.statement() : functionData.node.functionExpression().statement();
        if (!(bodyStatement.getText().startsWith("let"))) {
            const targetBytecode = this.getTargetBytecode(this.getParentIndex());
            targetBytecode.code.push(`APP ${args.length} ; Ejecutamos ${functionName} con ${args.length} argumentos`); //al llamarse handle, handle realiza el LDF
        }
        
        return null;
    }

    visitIfExpression(ctx) {
        const targetBytecode = this.getTargetBytecode();
    
        // Cargar y evaluar la condición
        const conditionNode = ctx.expression(0);
        const leftOperand = conditionNode.expression(0);
        const operator = conditionNode.getChild(1).getText();
        const rightOperand = conditionNode.expression(1);

        // Cargar los operandos
        this.loadValue(leftOperand);
        this.loadValue(rightOperand);

        // Mapa de operadores para las instrucciones correspondientes
        const operatorMap = {
            '>': 'GT',
            '>=': 'GTE',
            '<': 'LT',
            '<=': 'LTE',
            '==': 'EQ',
            '!=': 'NEQ',
        };

        // Agregar la instrucción de comparación
        if (operatorMap[operator]) {
            targetBytecode.code.push(`${operatorMap[operator]} ; ejecutar comparación ${operator}`);
        }

        // Guardar la posición actual de instrucción
        const bfJumpIndex = targetBytecode.code.length;

        // Instrucción BF (salto si la condición es falsa) con un offset temporal
        targetBytecode.code.push(`BF ? ; salto condicional a else`);

        // Procesar el bloque `then`
        const thenExpression = ctx.expression(1);
        this.loadValue(thenExpression);

        // Guardar la posición actual para el salto incondicional (BR) después del bloque `then`
        const brJumpIndex = targetBytecode.code.length;

        // Instrucción BR con un offset temporal, para saltar el bloque `else` después de `then`
        targetBytecode.code.push(`BR ? ; salto para omitir else`);

        // Calcular el offset para `BF`, y llenar el placeholder en la instrucción `BF`
        const elseJumpOffset = targetBytecode.code.length - bfJumpIndex;
        targetBytecode.code[bfJumpIndex] = `BF +${elseJumpOffset-1} ; salto condicional a else`;

        // Procesar el bloque `else`
        const elseExpression = ctx.expression(2);
        this.loadValue(elseExpression);

        // Calcular el offset para `BR` y llenar el placeholder en la instrucción `BR`
        const endJumpOffset = targetBytecode.code.length - brJumpIndex;
        targetBytecode.code[brJumpIndex] = `BR +${endJumpOffset-1} ; salto para omitir else`;
    }

    visitValueExpression(ctx) {
        let stringOperation = undefined
        for(let x = 0; x < ctx.children.length; x++) {
            if(ctx.children[x].STRING) {
                stringOperation = "Yes"
            } 
        }
        if(!stringOperation) {
            const tokens = this.tokenizeExpression(ctx.getText());
            const rpn = this.infixToRPN(tokens);
            this.evaluateRPN(rpn, ctx);
            return null;
        } else {
            this.evaluateString(ctx)
            return null;
        }
        
    }

    /*Funciones auxiliares de soporte para los metodos principales, ninguna interactua directamente con los ctx*/

    tokenizeExpression(expression) {
        const tokens = [];
        let current = '';
    
        for (let i = 0; i < expression.length; i++) {
            const char = expression[i];
            if (char === '*' && expression[i + 1] === '*') {
                if (current) {
                    tokens.push(current); 
                    current = '';
                }
                tokens.push('**'); 
                i++; 
            } else if ('+-*/()'.includes(char)) {
                if (current) {
                    tokens.push(current); 
                    current = '';
                }
                tokens.push(char); 
            } else if (/[a-zA-Z]/.test(char)) {
                current += char;
                if (expression[i + 1] === '[') {
                    let index = ''; 
                    i++; 
                    while (i + 1 < expression.length && expression[i + 1] !== ']') {
                        index += expression[++i];
                    }
                    i++; 
                    current += `[${index}]`; 
                    tokens.push(current);
                    current = '';
                }
            } else if (!isNaN(char) || char === '.') {
                current += char;
            } else if (char.trim() === '') {
                if (current) {
                    tokens.push(current); 
                    current = '';
                }
            }
        }
        if (current) {
            tokens.push(current);
        }
        return tokens;
    }

    evaluateRPN(rpn, ctx) {
        const stack = [];  
        const steps = [];
        let flag = null;
        let listName = null;
        const targetBytecode = this.getTargetBytecode();
    
        const determineOperation = (leftType, rightType, operation) => {
            const operationMap = {
                '+': { 'INT': 'ADD ; Sumar entero', 'FLOAT': 'ADD ; Sumar decimal', 'UNKNOWN': 'ADD ; Sumar' },
                '-': { 'INT': 'SUB ; Restar', 'FLOAT': 'SUB ; Restar', 'UNKNOWN': 'SUB ; Restar' },
                '*': { 'INT': 'MUL ; Multiplicar', 'FLOAT': 'MUL ; Multiplicar', 'UNKNOWN': 'MUL ; Multiplicar' },
                '/': { 'INT': 'DIV ; Dividir', 'FLOAT': 'DIV ; Dividir', 'UNKNOWN': 'DIV ; Dividir' },
                '**': { 'INT': 'POW ; Potenciar', 'FLOAT': 'POW ; Potenciar' }
            };
            return operationMap[operation]?.[leftType] || operationMap[operation]?.[rightType] || null;
        };
    
        const findNode = (value, listName) => {
            return this.findNodeByText(ctx, value) 
                ? this.findNodeByText(ctx, value) 
                : ctx.children[this.findIndexInList(this.variableMap.get(listName) ? this.variableMap.get(listName)[1].getText() : '', value)] 
                ? ctx.children[this.findIndexInList(this.variableMap.get(listName) ? this.variableMap.get(listName)[1].getText() : '', value)] 
                : null;
        };
    
        const operationFunctions = {
            '+': (a, b, x, y) => {
                if (x || y) {
                    if (x) this.loadValue(x);
                    if (y) this.loadValue(y);
                    if (x?.getText() !== flag || y?.getText() !== flag) targetBytecode.code.push('SWP ;invirtiendo orden de la operacion');
                }
                return a + b;
            },
            '-': (a, b, x, y) => {
                if (x || y) {
                    if (y) this.loadValue(y);
                    if (x) {
                        this.loadValue(x);
                        targetBytecode.code.push('SWP ;invirtiendo orden de la operacion');
                    }
                }
                return a - b;
            },
            '*': (a, b, x, y) => {
                if (x || y) {
                    if (y) this.loadValue(y);
                    if (x) this.loadValue(x);
                }
                return a * b;
            },
            '/': (a, b, x, y) => {
                if (x || y) {
                    if (y) this.loadValue(y);
                    if (x) {
                        this.loadValue(x);
                        targetBytecode.code.push('SWP ;invirtiendo orden de la operacion');
                    }
                }
                return a / b;
            },
            '**': (a, b, x, y) => {
                if (x || y) {
                    if (y && y.getText() !== flag) this.loadValue(y);
                    if (x && x.getText() !== flag) {
                        this.loadValue(x);
                        targetBytecode.code.push('SWP ;invirtiendo orden de la operacion');
                    }
                }
                return Math.pow(a, b);
            }
        };
    
        if (rpn.length == 1) {
            let varToken = this.splitVariableWithIndex(rpn[0]);
            const a = varToken.index;
            const x = this.findNodeByText(ctx, a) ? this.findNodeByText(ctx, a) : null;
            if (x) {
                this.loadValue(x);
            } else {
                throw new Error("Error inesperado intentando retornar el valor de una lista");
            }
        }
    
        for (let token of rpn) {
            if (this.isNumber(token)) {
                stack.push(parseFloat(token));  // Se convierte el número a float para asegurarse de que es un número decimal
            } else if (this.isVariable(token)) {
                let varToken = this.splitVariableWithIndex(token);
                listName = varToken.var;
                stack.push(parseFloat(varToken.index 
                    ? this.getItemFromList(this.variableMap.get(varToken.var)[1].getText(), varToken.index)
                    : this.variableMap.get(varToken.var)[1].getText()));
            } else if (this.isOperator(token)) {
                const b = stack.pop();  // Operando derecho (el primero que sale de la pila)
                const a = stack.pop();  // Operando izquierdo
                let x, y, determined;
                const operatorFn = operationFunctions[token];
                x = findNode(a, listName);
                y = findNode(b, listName);
                if (operatorFn) {
                    // Determina si se necesita invertir el orden de los operandos
                    const result = operatorFn(a, b, x, y);
                    // Ejecuta la operación correspondiente
                    determined = determineOperation(this.getType(x), this.getType(y), token);
                    if (determined) {
                        targetBytecode.code.push(determined);
                    }
                    // Apila el resultado de la operación
                    stack.push(result);
                    steps.push({ operation: `${a} ${token} ${b}`, result });
                } else {
                    throw new Error(`Operador no reconocido: ${token}`);
                }
            }
        }
    
        if (stack.length !== 1) {
            throw new Error('La expresión no es válida');
        }
    
        return stack.pop();  // Resultado final
    }

    evaluateString(ctx) {
        const targetBytecode = this.getTargetBytecode();

        const processExpression = (expr) => {
            if (!expr) return null;
    
            // Si es una operación binaria con '+'
            if (expr.children && expr.children.length === 3 && expr.children[1].getText() === '+') {
                const left = processExpression(expr.children[0]);
                const right = processExpression(expr.children[2]);
    
                if (!left || !right || left.type !== 'STRING' || right.type !== 'STRING') {
                    console.error("Error: Ambos operandos deben ser cadenas.");
                    return null;
                }
    
                // Generar bytecode para concatenar cadenas
                targetBytecode.code.push('CAT ; Concatenar cadenas');
                return { value: left.value + right.value, type: 'STRING' };
            }
            // Si es un literal o una variable, lo procesamos como cadena
            this.loadValue(expr);
    
            const literalValue = expr.getText();
            return { value: literalValue, type: 'STRING' };
        };
        processExpression(ctx);
    }

    findNodeByText(ctx, searchText) {
        // Verificamos si el texto del nodo actual es lo que buscamos
        if (ctx.getText() == searchText) {
            return ctx;  // Retornamos el nodo si el texto coincide
        }

        // Si el nodo tiene hijos, recorrémoslos recursivamente
        if (ctx.children) {
            for (let child of ctx.children) {
                const found = this.findNodeByText(child, searchText);
                if (found) {
                    return found;  // Retornamos el nodo encontrado
                }
            }
        }
        // Si no encontramos el nodo, retornamos null
        return null;
    }

    findIndexInList(listString, value) {
        const regex = /(?:\[(.*?)\])/;
        const match = listString.match(regex);
        if (!match) {
            return null
        }
        const elements = match[1]
            .split(',')
            .map(item => item.trim()) 
            .map(item => {
                if (!isNaN(item)) return Number(item);
                if (item.startsWith('"') && item.endsWith('"')) {
                    return item.slice(1, -1);
                }
                return item;
            });
        const index = elements.indexOf(value);
        if (index === -1) {
            throw new Error('El valor no se encuentra en la lista');
        }
        return index;
    }
    
    infixToRPN(tokens) {
        const output = [];  // Aquí se guardarán los números y operadores en RPN
        const operators = [];  // Pila para los operadores y paréntesis
    
        // Paso 1: Recorremos cada token de la expresión
        for (let token of tokens) {
            if (this.isNumber(token) || this.isVariable(token)) {
                // Si el token es un número, lo agregamos a la salida
                output.push(token);
            } else if (this.isOperator(token)) {
                // Si el token es un operador
                while (
                    operators.length > 0 &&
                    this.hasHigherPrecedence(operators[operators.length - 1], token)
                ) {
                    output.push(operators.pop());  // Sacamos operadores con mayor o igual precedencia
                }
                operators.push(token);  // Ponemos el operador actual en la pila
            } else if (token === '(') {
                // Si el token es un paréntesis de apertura, lo ponemos en la pila
                operators.push(token);
            } else if (token === ')') {
                // Si el token es un paréntesis de cierre, sacamos de la pila hasta encontrar el paréntesis de apertura
                while (operators.length > 0 && operators[operators.length - 1] !== '(') {
                    output.push(operators.pop());
                }
                operators.pop();  // Sacamos el paréntesis de apertura de la pila
            } else {
                return tokens
            }
        }
    
        // Paso 2: Vaciamos los operadores restantes en la pila
        while (operators.length > 0) {
            output.push(operators.pop());
        }
    
        return output;
    }

    getItemFromList(listString, index) {
        // Usamos una expresión regular para separar los elementos de la lista
        const regex = /(?:\[(.*?)\])/;
        const match = listString.match(regex);
        
        if (!match) {
            throw new Error('La lista no tiene un formato válido');
        }
    
        // Dividimos los elementos usando una coma y los limpiamos
        const elements = match[1]
            .split(',')
            .map(item => item.trim()) // Eliminamos espacios extra
            .map(item => {
                // Si el elemento es un número, lo convertimos a tipo numérico
                if (!isNaN(item)) return Number(item);
                // Si es una cadena, eliminamos las comillas
                if (item.startsWith('"') && item.endsWith('"')) {
                    return item.slice(1, -1);
                }
                return item;
            });
    
        // Retornamos el elemento si el índice es válido
        if (index < 0 || index >= elements.length) {
            throw new Error('Índice fuera de rango');
        }
    
        return elements[index];
    }
    
    // Subfunción para verificar si un token es un número
    isNumber(token) {
        return !isNaN(token);
    }

    isVariable(token) {
        const variableRegex = /^[a-zA-Z_][a-zA-Z0-9_]*(\[\d+\])?$/;
        return variableRegex.test(token);
    }
    
    splitVariableWithIndex(token) {
        const match = token.match(/^([a-zA-Z_][a-zA-Z0-9_]*)(\[(\d+)\])?$/);
        if (match) {
            return {
                var: match[1], // La parte antes de los corchetes
                index: match[3] || null // Solo el número dentro de los corchetes, o null si no hay índice
            };
        }
        return null; // Si el token no coincide con el formato esperado
    }
    
    // Subfunción para verificar si un token es un operador
    isOperator(token) {
        return ['+', '-', '*', '/', '**', '!', '>', '<', '>=', '<=', '==', '!=', '&&', '||'].includes(token);
    }
    
    // Subfunción para verificar si un operador tiene mayor precedencia que otro
    hasHigherPrecedence(op1, op2) {
        const precedence = {
            '+': 1,
            '-': 1,
            '*': 2,
            '/': 2,
            '**': 3,  // Exponentes tienen la mayor precedencia
            '!': 4,   // Operador unario (negación, etc.)
        };
        return precedence[op1] >= precedence[op2];
    }
    
    enterFunctionContext(funcName) {
        const parentContext = this.getCurrentContext();
        this.contextStack.push({ funcName, parent: parentContext? parentContext.funcName : null });
    }

    exitFunctionContext() {
        this.contextStack.pop();
    }

    getCurrentContext() {
        return this.contextStack.length > 0 ? this.contextStack[this.contextStack.length - 1] : null;
    }

    compareResults(steps, x1, y1) {
        if (steps.length < 2) {
          return false; 
        }
        const lastResult = steps[steps.length - 1].result;
        const secondLastResult = steps[steps.length - 2].result;
        return (x1 == lastResult && y1 == secondLastResult) || (x1 == secondLastResult && y1 == lastResult);
    }

    getTargetBytecode(bytecodeIndex = null) {
        return bytecodeIndex !== null 
            ? this.bytecode[bytecodeIndex] 
            : (this.getCurrentContext() ? this.bytecode[this.bytecode.length - 1] : this.bytecode[0]);
    }

    getParentIndex = () => {
        const lastContext = this.contextStack[this.contextStack.length - 1];
        if (lastContext?.funcName?.includes('LET-IN')) {
            const identifier = lastContext.funcName;
            return this.bytecode.findIndex(({ identifier: id }) => id === identifier);
        }
        const parentIdentifier = lastContext?.parent;
        return this.bytecode.findIndex(({ identifier }) => identifier === parentIdentifier) === -1
            ? 0
            : this.bytecode.findIndex(({ identifier }) => identifier === parentIdentifier);
    };

    replaceIdentifier(node, paramId, argValue) {
        if (!node) return null;
        const isTargetNode = node.ID && node.getText() === paramId;
        if (isTargetNode) return argValue;
        if (node.children) {
            node.children = node.children.map(child => 
                this.replaceIdentifier(child, paramId, argValue) || child
            );
        }
        return node;
    }

    getType(node) {
        return !node ? 'UNKNOWN' :
            node.INT ? 'INT' :
            node.FLOAT ? 'FLOAT' :
            node.STRING ? 'STRING' :
            node.ID ? 'ID' :
            'UNKNOWN'
    }

    unifyBytecode() {
        const unified = this.bytecode
            .map(pila => pila.code.join("\n")) // Une cada array `code` en un solo string
            .join("\n"); // Une todas las pilas respetando el orden
        return unified;
    }

}

function generateBytecode(input_File, outputFile) {
    const input = fs.readFileSync(input_File, 'utf-8');
    const chars = new antlr4.InputStream(input);
    const lexer = new BiesLexer(chars);
    const tokens = new antlr4.CommonTokenStream(lexer);
    const parser = new BiesParser(tokens);
    const tree = parser.program();
    const visitor = new BytecodeVisitor();
    const bytecode = visitor.visit(tree);
    fs.writeFileSync(outputFile, bytecode, 'utf-8');
}

export default generateBytecode;
