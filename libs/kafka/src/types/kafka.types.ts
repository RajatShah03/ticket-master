import { KAFKA_TOPICS } from '../constants/kafka.constants';

export type KafkaTopics = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];
