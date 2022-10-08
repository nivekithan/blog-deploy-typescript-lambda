import { Construct } from "constructs";
import { App, TerraformOutput, TerraformStack } from "cdktf";
import * as aws from "@cdktf/provider-aws";
import path from "node:path";
import { TypescriptFunction } from "./lib/typescriptFunction";

const lambdaRolePolicy = {
  Version: "2012-10-17",
  Statement: [
    {
      Action: "sts:AssumeRole",
      Principal: {
        Service: "lambda.amazonaws.com",
      },
      Effect: "Allow",
      Sid: "",
    },
  ],
};

export type LambdaConfig = {
  /**
   * Absolute path to directory which contains src/index.js which then exports handler
   * function
   */
  path: string;

  /**
   * Lambda version
   */
  version: string;
};

class LambdaStack extends TerraformStack {
  constructor(scope: Construct, name: string, config: LambdaConfig) {
    super(scope, name);

    new aws.AwsProvider(this, "aws", {
      region: "ap-south-1",
    });

    const sourceCodeAsset = new TypescriptFunction(this, "lambda-source-code", {
      absPath: config.path,
      handler: "index.handler",
    });

    // Create a s3 bucket
    const bucket = new aws.s3.S3Bucket(this, "bucket", {
      bucketPrefix: "slack-search-lambda",
    });

    // Upload source code to s3
    const lambdaArchive = new aws.s3.S3Object(this, "lambda-archive", {
      bucket: bucket.bucket,
      key: `${sourceCodeAsset.asset.fileName}/${config.version}`,
      source: sourceCodeAsset.asset.path,
    });

    // Create lambda role

    const role = new aws.iam.IamRole(this, "lambda-exec", {
      name: `learn-cdktf-${name}`,
      assumeRolePolicy: JSON.stringify(lambdaRolePolicy),
    });

    new aws.iam.IamRolePolicyAttachment(this, "lambda-managed-policy", {
      policyArn:
        "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
      role: role.name,
    });

    const lambdaFunc = new aws.lambdafunction.LambdaFunction(
      this,
      "slack-search-lambda",
      {
        functionName: `slack-search-lambda`,
        s3Bucket: bucket.bucket,
        s3Key: lambdaArchive.key,
        handler: "index.handler",
        runtime: "nodejs16.x",
        role: role.arn,
      }
    );

    new aws.lambdafunction.LambdaPermission(
      this,
      "lambda-allow-public-access",
      {
        statementId: "FunctionURLAllowPublicAccess",
        principal: "*",
        action: "lambda:InvokeFunctionUrl",
        functionName: lambdaFunc.functionName,
        functionUrlAuthType: "NONE",
      }
    );

    const lambdaFunctionUrl = new aws.lambdafunction.LambdaFunctionUrl(
      this,
      "lambdaFunctionUrl",
      { authorizationType: "NONE", functionName: lambdaFunc.functionName }
    );

    new TerraformOutput(this, "lambda-url", {
      value: lambdaFunctionUrl.functionUrl,
    });
  }
}

const app = new App();

new LambdaStack(app, "cdktf", {
  path: path.resolve(__dirname, "..", "ts-lambda"),
  version: "0.0.5",
});

app.synth();
