// PEG.js parser which converts logical expressions into JSON Logic

start
  = group / or / and / comparison
  
group "grouped expression"
  = _ "(" _ group:or _ ")" { return group; }

or "logical OR"
  = _ head:(and / comparison) tails:or_tails+ {
    return { "or": [head, ...tails] };
  }

or_tails
  = _ "||" _ tail:(and / comparison) { return tail; }
  
and "logical AND"
  = _ head:(group / comparison) tails:and_tails+ {
    return { "and": [head, ...tails] };
  }

and_tails
  = _ "&&" _ tail:(group / comparison) { return tail; }

comparison
  = ver_comparison / int_comparison

int_comparison "numeric comparison"
  = _ head:term _ expr:(">=" / ">" / "<=" / "<" / "===") _ tail:term _ {
    return { [expr]: [head, tail] };
  }
 
ver_comparison "version comparison"
  = _ head:term _ expr:(">=" / ">" / "<=" / "<" / "===") _ tail:version _ {
    return { ["ver " + expr]: [head, tail] };
  }

term
  = const / string / hex / integer

const "variable"
  = _ variable:(&[a-zA-Z][a-zA-Z0-9]+) { return {var: variable[1].join("")}; }

integer "number"
  = _ ("-"?[0-9]+) { return parseInt(text(), 10); }

hex "hex number"
  = _ ("0x"[0-9a-f]i+) { return parseInt(text(), 16); }

version "version string"
  = _ version:([0-9]+"."[0-9]+("."[0-9]+)?) { return text(); }
 
string "string"
  = _ ("\""[^\"]*"\"") { return text(); }
  /  _ ("'"[^']*"'") { return text(); }

_ "whitespace"
  = [ \t\n\r]*
