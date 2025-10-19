const CONFIG = {
    GAME: {
        CAMERA_DISTANCE: 15,
        CAMERA_HEIGHT: 6,
    },
    CAR: {
        MAX_SPEED: 30,
        ACCELERATION: 15,
        BRAKE_FORCE: 20,
        MAX_STEER_ANGLE: Math.PI / 6,
        WHEEL_RADIUS: 0.4,
        WHEEL_WIDTH: 0.3,
    },
    PHYSICS: {
        SUSPENSION_STIFFNESS: 30,
        SUSPENSION_REST_LENGTH: 0.3,
        FRICTION_SLIP: 5,
        DAMPING_RELAXATION: 2.3,
        DAMPING_COMPRESSION: 4.4,
        MAX_SUSPENSION_FORCE: 100000,
        ROLL_INFLUENCE: 0.01,
        CUSTOM_SLIDING_ROTATIONAL_SPEED: -30,
    },
    TRACK: {
        RADIUS: 40,
        STRAIGHT_LENGTH: 60,
        WIDTH: 12,
    },
};
