/** Join truthy class names. Dependency-free `classnames` alternative. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
