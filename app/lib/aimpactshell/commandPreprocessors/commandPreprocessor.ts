export abstract class CommandPreprocessor{
  abstract process(command: string): Promise<string>;
}
