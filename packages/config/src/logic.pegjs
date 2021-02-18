// PEG.js parser which converts logical expressions into JSON Logic

start
  = group / or / and / comparison
  
group
  = _ "(" _ group:or _ ")" { return group; }

or
  = _ head:(and / comparison) tails:or_tails+ {
    return { "or": [head, ...tails] };
  }

or_tails
  = _ "||" _ tail:(and / comparison) { return tail; }
  
and
  = _ head:(group / comparison) tails:and_tails+ {
    return { "and": [head, ...tails] };
  }

and_tails
  = _ "&&" _ tail:(group / comparison) { return tail; }

comparison
  = ver_comparison / int_comparison

int_comparison
  = _ head:term _ expr:(">=" / ">" / "<=" / "<" / "===") _ tail:term _ {
    return { [expr]: [head, tail] };
  }
 
ver_comparison
  = _ head:term _ expr:(">=" / ">" / "<=" / "<" / "===") _ tail:version _ {
    return { ["ver " + expr]: [head, tail] };
  }

term
  = const / string / integer

const
  = _ variable:(&[a-zA-Z][a-zA-Z0-9]+) { return {var: variable[1].join("")}; }

integer
  = _ ("-"?[0-9]+) { return parseInt(text(), 10); }

version
  = _ version:([0-9]+.[0-9]+) { return text(); }
 
string
  = _ ("\""[^\"]*"\"") { return text(); }
  /  _ ("'"[^']*"'") { return text(); }

_ "whitespace"
  = [ \t\n\r]*
