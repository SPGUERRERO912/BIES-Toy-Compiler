/**
 * @author Joel Ramirez
 * @author Sebastian Peñaranda
 * @author Marco Leandro
 * @version 1.0
 * @since 2024-11-16
 */

import fs from 'fs';
import antlr4 from 'antlr4';

import biesvmLexer from '../grammar/biesvmLexer.js';
import biesvmParser from '../grammar/biesvmParser.js';
import biesvmVisitor from '../grammar/biesvmVisitor.js';
import { VM } from '../src/VM.mjs';

class PrintVisitor extends biesvmVisitor {
  /**
   * Crea una instancia de PrintVisitor.
   * @param {number} traceLevel - El nivel de traza.
   */
  constructor(traceLevel = 0) {
    super();
    this.instructions = [];
    this.traceLevel = traceLevel;
  }

  trace(message) {
    if (this.traceLevel > 0) {
      console.error(`TRACE: ${message}`);
    }
  }

  visitProgram(ctx) {
    this.trace('Visiting program');
    this.visitChildren(ctx);
    return this.instructions;
  }

  visitFunDirective(ctx) {
    const functionName = ctx.ID(0).getText();
    const numArgs = ctx.INT() ? ctx.INT().getText() : null;
    const parentId = ctx.ID(1).getText();
    const bytecode = `$FUN ${functionName} args : ${numArgs || 0} parent : ${parentId || 0}`;
    this.trace(`Function Directive: ${bytecode}`);
    this.instructions.push(bytecode);
    return null;
  }

  visitEndDirective(ctx) {
    const functionName = ctx.ID().getText();
    this.trace(`End Directive: $END ${functionName}`);
    this.instructions.push(`$END ${functionName}`);
    return null;
  }

  visitAppInstruction(ctx) {
    const arg = ctx.INT().getText();
    this.trace(`App Instruction: APP ${arg}`);
    this.instructions.push(`APP ${arg}`);
    return null;
  }

  visitPopInstruction() {
    this.trace('Pop Instruction: POP');
    this.instructions.push('POP');
    return null;
  }

  visitSwpInstruction() {
    this.trace('Swap Instruction: SWP');
    this.instructions.push('SWP');
    return null;
  }

  visitBldInstruction(ctx) {
    const arg1 = ctx.INT(0).getText();
    const arg2 = ctx.INT(1).getText();
    this.trace(`Build Instruction: BLD ${arg1} ${arg2}`);
    this.instructions.push(`BLD ${arg1} ${arg2}`);
    return null;
  }

  visitBstInstruction(ctx) {
    const arg1 = ctx.INT(0).getText();
    const arg2 = ctx.INT(1) ? ctx.INT(1).getText() : null;

    if (arg2) {
      this.trace(`Boost Instruction: BST ${arg1} ${arg2}`);
      this.instructions.push(`BST ${arg1} ${arg2}`);
    } else {
      this.trace(`Boost Instruction: BST ${arg1}`);
      this.instructions.push(`BST ${arg1}`);
    }
    return null;
  }

  visitLdvInstruction(ctx) {
    if (ctx.list()) {
      const listValue = this.visitListDefinition(ctx.list());
      this.trace(`Load Variable Instruction (list): LDV ${listValue}`);
      this.instructions.push(`LDV ${listValue}`);
    } else if (ctx.STRING()) {
      const value = ctx.STRING().getText();
      this.trace(`Load Variable Instruction (string): LDV ${value}`);
      this.instructions.push(`LDV ${value}`);
    } else if (ctx.signedInt()) {
      const signedInt = ctx.signedInt(); // Acceder a signedInt
      const sign = signedInt.SIGN() ? signedInt.SIGN().getText() : ''; // Verificar si hay signo
      const value = signedInt.INT().getText(); // Obtener el número
      this.trace(`Load Variable Instruction (int): LDV ${value}`);
      this.instructions.push(`LDV ${sign}${value}`);
    } else {
      const mathConst = ctx.mathConst().getText();
      this.instructions.push(`LDV ${mathConst}`);
    }
  }

  visitListDefinition(ctx) {
    if (!ctx || !ctx.value) {
      console.log('Lista vacía o nula');
      return [];
    }
    const values = ctx.value().map((valueCtx) => this.visitValue(valueCtx));
    return values;
  }

  visitValue(ctx) {
    if (ctx.INT() != null) {
      return parseInt(ctx.INT().getText(), 10);
    } else if (ctx.STRING() != null) {
      return ctx.STRING().getText();
    }
    return null;
  }

  visitLdfInstruction(ctx) {
    const functionName = ctx.ID().getText();
    this.trace(`Load Function Instruction: LDF ${functionName}`);
    this.instructions.push(`LDF ${functionName}`);
    return null;
  }

  visitLdcInstruction(ctx) {
    if (ctx.INT()) {
      const value = ctx.INT().getText();
      this.trace(`Load Constant Instruction (int): LDC ${value}`);
      this.instructions.push(`LDC ${value}`);
    } else {
      const value = ctx.STRING().getText();
      this.trace(`Load Constant Instruction (string): LDC ${value}`);
      this.instructions.push(`LDC ${value}`);
    }
    return null;
  }

  visitAddInstruction() {
    this.trace('Add Instruction: ADD');
    this.instructions.push('ADD');
    return null;
  }

  visitMulInstruction() {
    this.trace('Add Instruction: MUL');
    this.instructions.push('MUL');
    return null;
  }

  visitDivInstruction() {
    this.trace('Add Instruction: DIV');
    this.instructions.push('DIV');
    return null;
  }

  visitSubInstruction() {
    this.trace('Add Instruction: SUB');
    this.instructions.push('SUB');
    return null;
  }

  visitNegInstruction() {
    this.trace('Add Instruction: NEG');
    this.instructions.push('NEG');
    return null;
  }

  visitSgnInstruction() {
    this.trace('Add Instruction: SGN');
    this.instructions.push('SGN');
    return null;
  }
  visitNeqInstruction() {
    this.trace('Add Instruction: NEQ');
    this.instructions.push('NEQ');
    return null;
  }
  visitEqInstruction() {
    this.trace('Add Instruction: EQ');
    this.instructions.push('EQ');
    return null;
  }

  visitGtInstruction() {
    this.trace('Add Instruction: GT');
    this.instructions.push('GT');
    return null;
  }

  visitGteInstruction() {
    this.trace('Add Instruction: GTE');
    this.instructions.push('GTE');
    return null;
  }

  visitLtInstruction() {
    this.trace('Add Instruction: LT');
    this.instructions.push('LT');
    return null;
  }

  visitLteInstruction() {
    this.trace('Add Instruction: LTE');
    this.instructions.push('LTE');
    return null;
  }
  visitAndInstruction() {
    this.trace('Add Instruction: AND');
    this.instructions.push('AND');
    return null;
  }

  visitOrInstruction() {
    this.trace('Add Instruction: OR');
    this.instructions.push('OR');
    return null;
  }

  visitXorInstruction() {
    this.trace('Add Instruction: XOR');
    this.instructions.push('XOR');
    return null;
  }

  visitNotInstruction() {
    this.trace('Add Instruction: NOT');
    this.instructions.push('NOT');
    return null;
  }

  visitSntInstruction() {
    this.trace('Add Instruction: SNT');
    this.instructions.push('SNT');
    return null;
  }
  visitStkInstruction() {
    this.trace('Add Instruction: STK');
    this.instructions.push('STK');
    return null;
  }
  visitSrkInstruction() {
    this.trace('Add Instruction: SRK');
    this.instructions.push('SRK');
    return null;
  }

  visitCatInstruction() {
    this.trace('Add Instruction: CAT');
    this.instructions.push('CAT');
    return null;
  }

  visitTosInstruction() {
    this.trace('Add Instruction: TOS');
    this.instructions.push('TOS');
    return null;
  }

  visitLntInstruction() {
    this.trace('Add Instruction: LNT');
    this.instructions.push('LNT');
    return null;
  }

  visitLinInstruction() {
    this.trace('Add Instruction: LIN');
    this.instructions.push('LIN');
    return null;
  }

  visitLtkInstruction() {
    this.trace('Add Instruction: LTK');
    this.instructions.push('LTK');
    return null;
  }

  visitLrkInstruction() {
    this.trace('Add Instruction: LRK');
    this.instructions.push('LRK');
    return null;
  }

  visitTolInstruction() {
    this.trace('Add Instruction: TOL');
    this.instructions.push('TOL');
    return null;
  }

  visitPrnInstruction() {
    this.trace('Add Instruction: PRN');
    this.instructions.push('PRN');
    return null;
  }

  visitRetInstruction() {
    this.trace('Add Instruction: RET');
    this.instructions.push('RET');
    return null;
  }

  visitCstInstruction(ctx) {
    let castingTo = '';

    const toCastMap = new Map([
      [
        ctx.number(),
        () => {
          castingTo = ctx.number().getText();
        },
      ],
      [
        ctx.string(),
        () => {
          castingTo = ctx.string().getText();
        },
      ],
      [
        ctx.cstlist(),
        () => {
          castingTo = ctx.cstlist().getText();
        },
      ],
    ]);
    for (let [key, action] of toCastMap) {
      if (key) {
        action();
        break;
      }
    }
    this.trace(`Casting Instruction: CST to ${castingTo}`);
    this.instructions.push(`CST ${castingTo}`);
    return null;
  }

  visitInoInstruction(ctx) {
    let instanceOff = '';

    const instanceMap = new Map([
      [
        ctx.number(),
        () => {
          instanceOff = ctx.number().getText();
        },
      ],
      [
        ctx.string(),
        () => {
          instanceOff = ctx.string().getText();
        },
      ],
      [
        ctx.cstlist(),
        () => {
          instanceOff = ctx.cstlist().getText();
        },
      ],
    ]);
    for (let [key, action] of instanceMap) {
      if (key) {
        action();
        break;
      }
    }
    this.trace(`Instance Instruction: INO with value ${instanceOff}`);
    this.instructions.push(`INO ${instanceOff}`);
    return null;
  }

  visitHltInstruction() {
    this.trace('Add Instruction: HLT');
    this.instructions.push('HLT');
    return null;
  }

  visitIniInstruction(ctx) {
    const functionName = ctx.ID().getText();
    this.trace(`Initialization Instruction: INI with function ${functionName}`);
    this.instructions.push(`INI ${functionName}`);
    return null;
  }

  visitBrInstruction(ctx) {
    const signedInt = ctx.signedInt();
    const sign = signedInt.SIGN() ? signedInt.SIGN().getText() : '';
    const number = signedInt.INT().getText();
    const instruction = `${sign}${number}`;
    this.trace(`Branch Instruction: ${instruction}`);
    this.instructions.push(`BR ${sign}${number}`);
  }

  visitBtInstruction(ctx) {
    const signedInt = ctx.signedInt();
    const sign = signedInt.SIGN() ? signedInt.SIGN().getText() : '';
    const number = signedInt.INT().getText();
    const instruction = `BT ${sign}${number}`;
    this.trace(`Branch True Instruction: ${instruction}`);
    this.instructions.push(`BT ${sign}${number}`);
  }

  visitBfInstruction(ctx) {
    const signedInt = ctx.signedInt();
    const sign = signedInt.children[0].getText();
    const number = signedInt.INT().getText();
    const instruction = `BF ${sign}${number}`;
    this.trace(`Branch False Instruction: ${instruction}`);
    this.instructions.push(`BF ${sign}${number}`);
  }

  visitNopInstruction() {
    this.trace('Add Instruction: NOP');
    this.instructions.push('NOP');
    return null;
  }

  visitVariableDeclaration(ctx) {
    const varName = ctx.ID().getText();
    const value = ctx.INT().getText();
    this.instructions.push(`LDV ${value}`);
    this.instructions.push(`BST 0 0`);
    this.instructions.push(`BLD 0 0`);
    this.trace(`Variable '${varName}' declarada con valor ${value}`);
    return null;
  }

  visitChildren(ctx) {
    if (!ctx) return;

    for (let i = 0; i < ctx.getChildCount(); i++) {
      this.visit(ctx.getChild(i));
    }
    return null;
  }
}

function test_parser(input_file, traceLevel = 0) {
  const input = fs.readFileSync(input_file, 'utf-8');

  const chars = new antlr4.InputStream(input);
  const lexer = new biesvmLexer(chars);
  const tokens = new antlr4.CommonTokenStream(lexer);
  const parser = new biesvmParser(tokens);
  parser.buildParseTrees = true;

  const ast = parser.program();

  const visitor = new PrintVisitor(traceLevel);
  const instructions = visitor.visit(ast);

  const vm = new VM(traceLevel);
  vm.run(instructions);
}

export default test_parser;
