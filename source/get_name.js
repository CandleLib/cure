/*
	Generates name from a scope hierachy.
*/
export default function getName(scope) {
	let 
		s = scope,
		name = scope.name;

	while (s.parent) {
		name = `${s.parent.name} => ${name}`;
		s = s.parent;
	}

	return name;
}