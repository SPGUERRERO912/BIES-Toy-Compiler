export class ContextLoader {
  constructor(vm, contextHandler) {
    this.vm = vm;
    this.contextHandler = contextHandler;
  }

  loadFunction(functionName) {
    const func = this.vm.functions[functionName];
    if (!func) {
      console.error(`Function ${functionName} not found!`);
      return;
    }
    const existingFunctionIndex = this.vm.environment.findIndex(
      (env) => env.identifier === functionName,
    );
    if (existingFunctionIndex !== -1) {
      const existingFunction = this.vm.environment.splice(
        existingFunctionIndex,
        1,
      )[0];
      this.vm.environment.unshift(existingFunction);
    } else {
      this.args = this.vm.callStack.map((item) => item.args)[0];
      this.registerCopy = [...this.vm.register];
      this.locals = this.registerCopy.slice(-this.args).reverse();
      func.instructions.isLoaded = true;
      this.newEnvironment = Array.from({ length: 10 }, (_, index) =>
        this.args > 0 && this.locals[index] !== undefined
          ? this.locals[index]
          : [],
      );
      this.newEnvironment.identifier = functionName;
      this.vm.environment.unshift(this.newEnvironment);
    }
    this.contextHandler.saveContext(functionName);
    this.vm.register = this.registerCopy.slice(0, -this.args);
    this.vm.programCounter = 0;
    this.vm.run(func.instructions);
  }

  returnFromFunction(functionName) {
    const func = this.vm.functions[functionName];
    this.contextHandler.restoreContext();
    const stackIndex = this.vm.environment.findIndex(
      (env) => env.identifier === functionName,
    );
    if (stackIndex !== -1) {
      const [stack] = this.vm.environment.splice(stackIndex, 1);
      this.vm.environment.unshift(stack);
    }
    this.vm.run(func.instructions);
  }
}
