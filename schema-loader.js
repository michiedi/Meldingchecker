async function loadSchema(){
  const res = await fetch('schema.json');
  if(!res.ok) throw new Error('Schema kon niet geladen worden');
  return await res.json();
}
