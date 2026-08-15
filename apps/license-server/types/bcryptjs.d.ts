declare module 'bcryptjs' {
  export function hash(data: string | Buffer, saltOrRounds: string | number): Promise<string>;
  export function hashSync(data: string | Buffer, saltOrRounds: string | number): string;
  export function compare(data: string | Buffer, encrypted: string): Promise<boolean>;
  export function compareSync(data: string | Buffer, encrypted: string): boolean;
  export function genSalt(rounds?: number): Promise<string>;
  export function genSaltSync(rounds?: number): string;
  const _default: {
    hash: typeof hash;
    hashSync: typeof hashSync;
    compare: typeof compare;
    compareSync: typeof compareSync;
    genSalt: typeof genSalt;
    genSaltSync: typeof genSaltSync;
  };
  export default _default;
}
