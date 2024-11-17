grammar biesvm;

// Definir la entrada del parser
program : (directive | instruction)+ EOF;

// Definir las directivas con orden flexible para los opcionales
directive
    : FUN ID args COLON INT parent COLON ID   # FunDirective
    | END ID                                  # EndDirective
    ;
   
// Definir las instrucciones con la cantidad y tipo de argumentos
instruction
    : POP                                          # PopInstruction
    | SWP                                          # SwpInstruction
    | BLD INT INT                                  # BldInstruction
    | BST INT (INT)?                               # BstInstruction  // Acepta 1 o 2 INT
    | LDV (signedInt | STRING | list | mathConst)  # LdvInstruction   
    | LDF ID                                       # LdfInstruction   
    | LDC                                          # LdcInstruction
    | ADD                                          # AddInstruction
    | MUL                                          # MulInstruction
    | DIV                                          # DivInstruction
    | SUB                                          # SubInstruction
    | NEG                                          # NegInstruction
    | SGN                                          # SgnInstruction
    | NEQ                                          # NeqInstruction
    | EQ                                           # EqInstruction    
    | GT                                           # GtInstruction    
    | GTE                                          # GteInstruction   
    | LT                                           # LtInstruction    
    | LTE                                          # LteInstruction   
    | AND                                          # AndInstruction
    | OR                                           # OrInstruction
    | XOR                                          # XorInstruction
    | NOT                                          # NotInstruction
    | SNT                                          # SntInstruction
    | STK                                          # StkInstruction
    | SRK                                          # SrkInstruction
    | CAT                                          # CatInstruction
    | TOS                                          # TosInstruction
    | LNT                                          # LntInstruction
    | LIN                                          # LinInstruction
    | LTK                                          # LtkInstruction
    | LRK                                          # LrkInstruction
    | TOL                                          # TolInstruction
    | APP INT                                      # AppInstruction   
    | PRN                                          # PrnInstruction
    | RET                                          # RetInstruction
    | CST (number | string | cstlist)              # CstInstruction 
    | INO (number | string | cstlist)              # InoInstruction
    | HLT                                          # HltInstruction
    | INI ID                                       # IniInstruction
    | BR signedInt                                 # BrInstruction      
    | BT signedInt                                 # BtInstruction      
    | BF signedInt                                 # BfInstruction      
    | NOP                                          # NopInstruction
    | LEN                                          # LenInstruction
    | POW                                          # PowInstruction     
    ;

// Directivas del linker/loader
FUN  : '$FUN';
END  : '$END';
ID : DOLLAR INT;
args    : 'args';
parent  : 'parent'; 

// Definir tokens para las instrucciones
POP  : 'POP';
SWP  : 'SWP'; 
BLD  : 'BLD';
BST  : 'BST';  
LDV  : 'LDV';  
LDF  : 'LDF';  
LDC  : 'LDC';
ADD  : 'ADD';
MUL  : 'MUL';
DIV  : 'DIV';
SUB  : 'SUB';
NEG  : 'NEG';
SGN  : 'SGN';
NEQ   : 'NEQ';
EQ   : 'EQ';
GT   : 'GT';
GTE  : 'GTE';
LT   : 'LT';
LTE  : 'LTE';
AND  : 'AND';
OR   : 'OR';
XOR  : 'XOR';
NOT  : 'NOT';
SNT  : 'SNT';
STK  : 'STK';
SRK  : 'SRK';
CAT  : 'CAT';
TOS  : 'TOS';
LNT  : 'LNT';                  
LIN  : 'LIN';                  
LTK  : 'LTK';                  
LRK  : 'LRK';                  
TOL  : 'TOL';                  
APP  : 'APP';  
PRN  : 'PRN';
RET  : 'RET';
CST  : 'CST';
INO  : 'INO';
HLT  : 'HLT';
INI  : 'INI';
BR   : 'BR';
BT   : 'BT';
BF   : 'BF';
NOP  : 'NOP';
LEN  : 'LEN';
POW  : 'POW'; 

// Definir los token básicos
DOLLAR  : '$';
INT     : [0-9]+ ( '.' [0-9]+ )?;
STRING : '"' ( ~["\\] | '\\' . )* '"';
COLON   : ':';
SIGN : '+' | '-';
WS      : [ \t\r\n]+ -> skip;

// Casting identifier token
number : 'number';
string : 'string';
cstlist : 'list';
mathConst: Math('.')?('pi' | 'euNum' | 'euConst' | 'phi');
Math: 'Math';

// Definir la regla para listas
list
    : '[' value? (',' value?)* ']'  # ListDefinition
    ;

value
    : INT
    | STRING
    ;

signedInt
    : (SIGN)? INT;  // Puede incluir un signo opcional '+' o '-'

// Comentarios de una línea (inician con ; y terminan con newline)
COMMENT : ';' .*? '\n' -> channel(HIDDEN);