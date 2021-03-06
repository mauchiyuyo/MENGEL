from modules.DMZ.data_kit import validation_package
from modules.DMZ.data_kit import data_filler
from modules.DMZ.data_kit import data_scaling
from modules.DMZ.data_kit import data_splitting
from modules.DMZ.data_kit import filler_strategy
from modules.DMZ.data_kit import filler_regression
from modules.DMZ.data_kit import text_handler


# This class will manage the data for the worker and prep it for use.
# Eventually it will make changes to the data. Currently it does not.
class DataController(object):

    def __init__(self, ticket):
        self.validation_pack = validation_package.ValidationPackage()
        self.unlabeled_data = None
        self.unlabeled_id = None

        self.prepare_data(ticket.training, ticket.testing,
                          ticket.target)

    # Runs a series of cleaning and data modification algorithms and tools to ready
    # the data for training. TODO: Split and simplify with strategies.
    def prepare_data(self, training, testing, target):
        # Separating label data from training data.
        training, label_data = data_splitting.separate_target(training, target)

        # Temporary until we properly handle strings and text data.
        training = text_handler.convert_dataframe_text(training, .1)
        testing = text_handler.convert_dataframe_text(testing, .1)
        training = data_splitting.remove_non_numeric_columns(training)
        testing = data_splitting.remove_non_numeric_columns(testing)

        # Will need a function which governs what missing data system is used.
        reg_filler = filler_regression.RegressionFiller(training, testing)
        training = reg_filler.get_filled_data()
        testing = reg_filler.get_filled_test_data()

        # Scaling data. Will need a function which governs scaling method.
        training, testing = data_scaling.scale_data(training, testing)

        # Splitting into training and testing data
        self.validation_pack.prepare_package(training, label_data, .2)
        self.unlabeled_data = testing
