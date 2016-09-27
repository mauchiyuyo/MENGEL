# Helper functions for the whole framework to use

import pandas as pd
from sklearn import cross_validation
from sklearn import preprocessing


def get_train_test(pandas_data, target_col):
    # Selection of training/target data and scaling of the training data.
    # Scaling is important because if the variables are too different from
    # one another, it can throw off the model.
    # EX: If one variable has an average of 1000, and another has an average
    # of .5, then the model won't be as accurate.
    data = pd.DataFrame.as_matrix(pandas_data)
    target_loc = pandas_data.columns.get_loc(target_col)
    y = data[:, target_loc]

    x = pandas_data.drop(target_col, 1)
    x = pd.DataFrame.as_matrix(x)

    x = preprocessing.scale(x)

    # Selecting training and test sets
    return cross_validation.train_test_split(x, y, test_size=0.2)


# This will take the target "predicted" column and decide if classification or regression should be used.
def get_prediction_type(target_column):
    sorted_data = sorted(target_column)

    prediction_type = "classification"

    last = None

    for val in sorted_data:
        if not isinstance(val, (int, float)):
            prediction_type = "invalid"
        if not last:
            last = val
        else:
            if last == val - 1:
                last = val
            elif last != val:
                prediction_type = "regression"
                break

    return prediction_type


def get_data(path, filename, separator):
    return pd.read_csv(path + filename, sep=separator)
