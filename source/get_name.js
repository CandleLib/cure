/*
	Generates name from a scope hierachy.
*/
export default function getName(scope) {
	let 
		s = scope,
		name = scope.name;

	while (s.parent) {
		name = `${s.parent.name} \u27A4 ${name}`;
		s = s.parent;
	}

	return name;
}