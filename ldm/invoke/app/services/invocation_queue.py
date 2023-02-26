# Copyright (c) 2022 Kyle Schouviller (https://github.com/kyle0654)

from abc import ABC, abstractmethod
from queue import Queue


# TODO: make this serializable
class InvocationQueueItem:
    #session_id: str
    graph_execution_state_id: str
    invocation_id: str
    invoke_all: bool

    def __init__(self,
        #session_id: str,
        graph_execution_state_id: str,
        invocation_id: str,
        invoke_all: bool = False):
        #self.session_id = session_id
        self.graph_execution_state_id = graph_execution_state_id
        self.invocation_id = invocation_id
        self.invoke_all = invoke_all


class InvocationQueueABC(ABC):
    """Abstract base class for all invocation queues"""
    @abstractmethod
    def get(self) -> InvocationQueueItem:
        pass
    
    @abstractmethod
    def put(self, item: InvocationQueueItem|None) -> None:
        pass


class MemoryInvocationQueue(InvocationQueueABC):
    __queue: Queue

    def __init__(self):
        self.__queue = Queue()
    
    def get(self) -> InvocationQueueItem:
        return self.__queue.get()
    
    def put(self, item: InvocationQueueItem|None) -> None:
        self.__queue.put(item)
