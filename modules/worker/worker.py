import data_controller, model_controller, gym


# This is the starting point for a worker, this will be changed when we
# start deploying workers with C code across the network.
class Worker(object):

    def __init__(self, hub):
        self.ticket = hub.get_ticket()
        self.data_control = data_controller.DataController(self.ticket.training,
                                                           self.ticket.target)

        self.model_control = model_controller.ModelController(self.ticket.ml_algorithm)
        self.model_gym = gym.Gym()

        self.model_gym.validate_model(self.data_control, self.model_control)
