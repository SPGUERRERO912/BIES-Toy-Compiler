export class ContextHandler {
  constructor(vm) {
    this.vm = vm;
    this.contextStack = [];
    this.parent = null;
  }

  saveContext() {
    const currentContext = {
      environment: this.vm.environment.map((env) => ({
        values: [...env], // Copia los valores del array
        identifier: env.identifier, // Copia el identifier de la pila
      })),
      programCounter: this.vm.programCounter,
      callStack: [...this.vm.callStack],
    };
    this.contextStack.push(currentContext);
  }

  restoreContext() {
    if (this.contextStack.length > 0) {
      const restoredContext = this.contextStack.pop();
      this.vm.register = [...this.vm.register];
      this.vm.environment = restoredContext.environment
        .map((env) => {
          const newEnv = [...env.values]; // Restaura los valores de la pila interna
          newEnv.identifier = env.identifier; // Restaura el identifier
          return newEnv;
        })
        .slice()
        .reverse();
      this.vm.programCounter = restoredContext.programCounter;
    } else {
      console.error('No context to restore!');
    }
  }
}
