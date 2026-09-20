import os

import boto3

_dynamodb = boto3.resource("dynamodb")


def get_table(env_var_name):
    table_name = os.environ[env_var_name]
    return _dynamodb.Table(table_name)
