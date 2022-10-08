import { AssetType, TerraformAsset } from "cdktf";
import { Construct } from "constructs";
import { buildSync } from "esbuild";
import path from "path";

const bundle = (absWorkingDirectory: string) => {
  buildSync({
    entryPoints: ["src/index.ts"],
    platform: "node",
    target: "es2018",
    bundle: true,
    format: "cjs",
    sourcemap: "linked",
    outdir: "dist",
    absWorkingDir: absWorkingDirectory,
  });

  return path.join(absWorkingDirectory, "dist");
};

export type TypescriptFunctionsProps = {
  handler: string;

  // Expects absolute path to directory which expects
  // <absPath>/src/index.ts to be present
  //
  // <absPath>/dist will contain complied code
  absPath: string;
};

export class TypescriptFunction extends Construct {
  readonly handler: string;
  readonly asset: TerraformAsset;

  constructor(scope: Construct, id: string, props: TypescriptFunctionsProps) {
    super(scope, id);

    this.handler = props.handler;

    const workingDirectory = props.absPath;
    const distDirectory = bundle(workingDirectory);

    this.asset = new TerraformAsset(this, "lambda-asset", {
      path: distDirectory,
      type: AssetType.ARCHIVE,
    });
  }
}
