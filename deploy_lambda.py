"""Deploy MediBot FastAPI backend to AWS Lambda with Function URL."""
import boto3
import json
import zipfile
import os
import io
import time

# Create deployment package
print("Creating deployment package...")
zip_buffer = io.BytesIO()
with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk("backend"):
        if "__pycache__" in root:
            continue
        for file in files:
            if file.endswith(".py"):
                filepath = os.path.join(root, file)
                zf.write(filepath, filepath)
    zf.write("backend/lambda_handler.py", "lambda_handler.py")

zip_buffer.seek(0)
zip_bytes = zip_buffer.read()
print(f"Package size: {len(zip_bytes) / 1024:.0f} KB")

lam = boto3.client("lambda", region_name="us-east-1")
iam = boto3.client("iam")
function_name = "medibot-api"

# Create or get IAM role
role_arn = None
try:
    role = iam.get_role(RoleName="medibot-lambda-role")
    role_arn = role["Role"]["Arn"]
    print(f"Role exists: {role_arn}")
except:
    print("Creating IAM role...")
    trust = json.dumps({
        "Version": "2012-10-17",
        "Statement": [{"Effect": "Allow", "Principal": {"Service": "lambda.amazonaws.com"}, "Action": "sts:AssumeRole"}]
    })
    role = iam.create_role(RoleName="medibot-lambda-role", AssumeRolePolicyDocument=trust)
    role_arn = role["Role"]["Arn"]
    for policy in [
        "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
        "arn:aws:iam::aws:policy/AmazonBedrockFullAccess",
        "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess",
        "arn:aws:iam::aws:policy/AmazonS3FullAccess",
    ]:
        iam.attach_role_policy(RoleName="medibot-lambda-role", PolicyArn=policy)
    print(f"Role created: {role_arn}")
    print("Waiting 10s for role propagation...")
    time.sleep(10)

# Create or update Lambda
try:
    lam.get_function(FunctionName=function_name)
    print("Updating Lambda function...")
    lam.update_function_code(FunctionName=function_name, ZipFile=zip_bytes)
    print("Updated!")
except lam.exceptions.ResourceNotFoundException:
    print("Creating Lambda function...")
    lam.create_function(
        FunctionName=function_name,
        Runtime="python3.12",
        Role=role_arn,
        Handler="lambda_handler.handler",
        Code={"ZipFile": zip_bytes},
        Timeout=60,
        MemorySize=512,
        Environment={"Variables": {"DEV_MODE": "true"}},
        Architectures=["arm64"],
    )
    print("Lambda created!")
    time.sleep(5)

    # Add Function URL
    print("Adding Function URL...")
    url_config = lam.create_function_url_config(
        FunctionName=function_name,
        AuthType="NONE",
        Cors={"AllowOrigins": ["*"], "AllowMethods": ["*"], "AllowHeaders": ["*"]},
    )
    print(f"Function URL: {url_config['FunctionUrl']}")

    # Allow public invoke
    lam.add_permission(
        FunctionName=function_name,
        StatementId="PublicAccess",
        Action="lambda:InvokeFunctionUrl",
        Principal="*",
        FunctionUrlAuthType="NONE",
    )

# Print the URL
try:
    url = lam.get_function_url_config(FunctionName=function_name)
    print(f"\n{'='*50}")
    print(f"BACKEND API URL: {url['FunctionUrl']}")
    print(f"{'='*50}")
    print(f"\nUpdate patient-app/.env.local with:")
    print(f"NEXT_PUBLIC_API_URL={url['FunctionUrl']}api/v1")
except Exception as e:
    print(f"Could not get URL: {e}")
