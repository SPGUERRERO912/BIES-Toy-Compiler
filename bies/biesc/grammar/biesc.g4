grammar biesc;

program
    : statement+ EOF
    ;

statement
    : varDeclaration
    | printStatement
    | functionCall 
    | expression 
    ;

varDeclaration
    : 'let' ID '=' valueExpression                                
    | 'let' '{' constDeclaration* '}' 'in' ( '{' statement+ '}' | statement )
    ;

printStatement
    : 'print' '(' printArgument ')'
    ;

constDeclaration
    : 'const' ID '=' valueExpression
    ;

printArgument
    : expression
    | functionCall
    ;

functionExpression
    : (ID '=>')+ statement                      // Permite lambdas anidadas sin paréntesis
    | '(' (ID (',' ID)*)? ')' '=>' statement     // Permite lambdas con paréntesis y varios parámetros
    ;

functionCall
    : ID '(' (expression (',' expression)*)? ')' ( '(' (expression (',' expression)*)? ')' )*
    ;

valueExpression
    : expression
    | arrayLiteral                             
    | inputExpression 
    ;

inputExpression
    : 'input' '(' STRING ')'                    
    ;

arrayLiteral
    : '[' (expression (',' expression)*)? ']'   
    ;

lenExpression 
    : 'len' '(' expression ')'
    ;

expression
    : expression '**' expression        # exponent
    | expression '*' expression         # multiply
    | expression '/' expression         # divide
    | expression '+' expression         # add
    | expression '-' expression         # subtract
    | expression '>' expression         # greater
    | expression '>=' expression        # greaterEqual
    | expression '<' expression         # less
    | expression '<=' expression        # lessEqual
    | expression '==' expression        # equal
    | expression '!=' expression        # notEqual
    | expression '&&' expression        # and
    | expression '||' expression        # or
    | '!' expression                    # not
    | '(' expression ')'                # parens
    | functionExpression                # function
    | ifExpression                      # ifExpr
    | primary '[' expression ']'        # indexAccess
    | INT                               # intLiteral
    | FLOAT                             # floatLiteral
    | STRING                            # stringLiteral
    | ID                                # variable
    | lenExpression                     # len
    ;

primary
    : ID                                // variable
    | arrayLiteral                      // array literal
    | '(' expression ')'                // parens
    ;

ifExpression
    : 'if' '(' expression ')' 'then' expression 'else' expression
    ;

ID    : [a-zA-Z_][a-zA-Z0-9_]* ;
INT   : [0-9]+ ;
FLOAT : [0-9]+ '.' [0-9]+ ;
STRING: '"' (~["\r\n])* '"' ;
WS    : [ \t\r\n]+ -> skip ;
COMMENT : '//' ~[\r\n]* -> skip ;