ACTIVITY_CLASSES = [
    "still",
    "walking",
    "stairs",
    "sit_stand_transition",
    "lie_getup_transition",
    "tying_shoe",
    "sensor_hit",
    "fall",
]

ACTIVITY_TO_ID = {name: index for index, name in enumerate(ACTIVITY_CLASSES)}

STILL_ID = ACTIVITY_TO_ID["still"]
FALL_ID = ACTIVITY_TO_ID["fall"]
NUM_ACTIVITIES = len(ACTIVITY_CLASSES)

SCENARIO_TO_ACTIVITY = {
    "walk": "walking",
    "stair": "stairs",
    "chair": "sit_stand_transition",
    "bed": "lie_getup_transition",
    "shoe": "tying_shoe",
    "clap": "sensor_hit",
    "fall1": "fall",
    "fall2": "fall",
    "fall3": "fall",
    "fall4": "fall",
    "fall5": "fall",
    "fall6": "fall",
}


def activity_id_for_scenario(scenario: str) -> int:
    try:
        return ACTIVITY_TO_ID[SCENARIO_TO_ACTIVITY[scenario]]
    except KeyError as error:
        raise ValueError(f"Unknown scenario: {scenario}") from error
