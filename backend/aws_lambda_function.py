import boto3
import json
import os
import uuid
import shapefile
import zipfile
from datetime import datetime

s3 = boto3.client('s3')

def generate_presigned_url(bucket_name, key, expiration=3600):
    url = s3.generate_presigned_url(
        ClientMethod='get_object',
        Params={'Bucket': bucket_name, 'Key': key},
        ExpiresIn=expiration
    )
    return url

def generate_unique_filename():
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%S%f")[:-3]  # 例: 20250327T043015123
    id = uuid.uuid4().hex[:8]
    return timestamp + "_" + id

def lambda_handler(event, context):

    if event['httpMethod'] == 'OPTIONS':
        # プリフライトリクエストに対するCORS対応
        return {
            'statusCode': 204,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST,OPTIONS',
            }
        }


    try:
        # API Gateway経由の場合、bodyは文字列で渡される
        if "body" in event:
            if isinstance(event["body"], str):
                geojson = json.loads(event["body"])
            else:
                geojson = event["body"]
        else:
            geojson = event  # テスト用（Lambdaコンソールから）

        base_path = "/tmp/output"
        w = shapefile.Writer(base_path, shapeType=shapefile.POLYGON)
        w.field("TOTAL_AMT", "N")

        for feature in geojson["features"]:
            coords = feature["geometry"]["coordinates"]
            total = feature["properties"].get("amount_fertilization_total", 0)
            w.poly(coords)
            w.record(total)

        w.close()

        zip_path = "/tmp/output.zip"
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            for ext in ['shp', 'shx', 'dbf']:
                filepath = f"{base_path}.{ext}"
                filename = f"output.{ext}"
                zipf.write(filepath, arcname=filename)

        bucket_name = 'vfmaker'



        filename = generate_unique_filename()
        s3_key = f"shapefiles/{filename}.zip"

        s3.upload_file(zip_path, bucket_name, s3_key)
        print(f"Uploaded ZIP to s3://{bucket_name}/{s3_key}")

        presigned_url = generate_presigned_url(bucket_name, s3_key)

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Download link generated.',
                'download_url': presigned_url
            }),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-store',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST,OPTIONS',
                'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
                'X-Content-Type-Options': 'nosniff'
            }
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'message': 'Internal server error', 'error': str(e)}),
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            }
        }


