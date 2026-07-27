// Expand a Spintax template like "Hi {there|friend|neighbor}" into a random
// concrete string. Supports nesting: "{Hey|Hi {there|friend}}".
//
// Non-Spintax text (no `{`) is returned unchanged. `{{token}}` template tokens
// are left alone so `renderTemplate` can still fill them in.
export function spinOnce(input: string, rand: () => number = Math.random): string {
  // Protect `{{...}}` template tokens by swapping them for placeholders first.
  const tokens: string[] = [];
  const protectedStr = input.replace(/\{\{[^}]+\}\}/g, (m) => {
    tokens.push(m);
    return `\u0000T${tokens.length - 1}\u0000`;
  });

  let s = protectedStr;
  // Repeatedly replace the innermost `{a|b|c}` group with a random choice.
  const re = /\{([^{}]+)\}/;
  let safety = 0;
  while (re.test(s) && safety++ < 500) {
    s = s.replace(re, (_m, group: string) => {
      const options = group.split("|");
      return options[Math.floor(rand() * options.length)] ?? "";
    });
  }

  return s.replace(/\u0000T(\d+)\u0000/g, (_m, i: string) => tokens[Number(i)] ?? "");
}

// Enumerate up to `max` distinct expansions for a preview UI.
export function spinSample(input: string, max = 3): string[] {
  const seen = new Set<string>();
  let attempts = 0;
  while (seen.size < max && attempts++ < max * 20) {
    seen.add(spinOnce(input));
  }
  return Array.from(seen);
}

// Count possible unique expansions (for a "12 variants" indicator).
export function spinCount(input: string): number {
  const stripped = input.replace(/\{\{[^}]+\}\}/g, "");
  let s = stripped;
  let total = 1;
  const re = /\{([^{}]+)\}/;
  let safety = 0;
  while (re.test(s) && safety++ < 500) {
    let localMult = 1;
    s = s.replace(re, (_m, group: string) => {
      localMult *= Math.max(1, group.split("|").length);
      return "";
    });
    total *= localMult;
  }
  return total;
}