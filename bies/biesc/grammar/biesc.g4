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
    : '(' (ID (',' ID)*)? ')' '=>' statement
    ;

functionCall
    : ID '(' (expression (',' expression)*)? ')'
    ;

valueExpression
    : expression
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
    | INT                               # intLiteral
    | FLOAT                             # floatLiteral
    | STRING                            # stringLiteral
    | ID                                # variable
    ;

ID    : [a-zA-Z_][a-zA-Z0-9_]* ;
INT   : [0-9]+ ;
FLOAT : [0-9]+ '.' [0-9]+ ;
STRING: '"' (~["\r\n])* '"' ;
WS    : [ \t\r\n]+ -> skip ;
COMMENT : '//' ~[\r\n]* -> skip ; 