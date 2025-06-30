package com.analytics.pipeline;

import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.functions.MapFunction;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;
import org.apache.flink.connector.kafka.sink.KafkaRecordSerializationSchema;
import org.apache.flink.connector.kafka.sink.KafkaSink;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.windowing.time.Time;
import org.apache.flink.streaming.api.windowing.assigners.TumblingProcessingTimeWindows;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

public class EventEnrichmentJob {
    
    private static final ObjectMapper objectMapper = new ObjectMapper();
    
    public static void main(String[] args) throws Exception {
        final StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        
        // Configure Kafka source
        KafkaSource<String> source = KafkaSource.<String>builder()
            .setBootstrapServers("kafka:29092")
            .setTopics("audit-events")
            .setGroupId("flink-enrichment-group")
            .setStartingOffsets(OffsetsInitializer.latest())
            .setValueOnlyDeserializer(new SimpleStringSchema())
            .build();

        // Configure Kafka sink
        KafkaSink<String> sink = KafkaSink.<String>builder()
            .setBootstrapServers("kafka:29092")
            .setRecordSerializer(KafkaRecordSerializationSchema.builder()
                .setTopic("enriched-events")
                .setValueSerializationSchema(new SimpleStringSchema())
                .build())
            .build();

        // Create data stream from Kafka
        DataStream<String> eventStream = env
            .fromSource(source, WatermarkStrategy.forBoundedOutOfOrderness(Duration.ofSeconds(20)), "kafka-source");

        // Enrich events and detect anomalies
        DataStream<String> enrichedStream = eventStream
            .map(new EventEnrichmentFunction())
            .map(new AnomalyDetectionFunction());

        // Aggregate events in tumbling windows
        DataStream<String> aggregatedStream = enrichedStream
            .keyBy(new EventTypeKeySelector())
            .window(TumblingProcessingTimeWindows.of(Time.minutes(1)))
            .aggregate(new EventAggregator());

        // Send enriched events to output topic
        enrichedStream.sinkTo(sink);
        
        // Also send aggregations to a different topic
        KafkaSink<String> aggregationSink = KafkaSink.<String>builder()
            .setBootstrapServers("kafka:29092")
            .setRecordSerializer(KafkaRecordSerializationSchema.builder()
                .setTopic("event-aggregations")
                .setValueSerializationSchema(new SimpleStringSchema())
                .build())
            .build();
            
        aggregatedStream.sinkTo(aggregationSink);

        env.execute("Event Enrichment and Anomaly Detection Job");
    }

    // Event enrichment function
    public static class EventEnrichmentFunction implements MapFunction<String, String> {
        @Override
        public String map(String event) throws Exception {
            try {
                JsonNode eventJson = objectMapper.readTree(event);
                ObjectNode enrichedEvent = (ObjectNode) eventJson;
                
                // Add enrichment data
                enrichedEvent.put("processed_timestamp", System.currentTimeMillis());
                enrichedEvent.put("enrichment_version", "1.0");
                
                // Add geolocation if IP is present
                if (eventJson.has("metadata") && eventJson.get("metadata").has("ip")) {
                    String ip = eventJson.get("metadata").get("ip").asText();
                    ObjectNode geoData = objectMapper.createObjectNode();
                    geoData.put("country", getCountryFromIP(ip));
                    geoData.put("city", getCityFromIP(ip));
                    enrichedEvent.set("geolocation", geoData);
                }
                
                // Add risk score
                enrichedEvent.put("risk_score", calculateRiskScore(eventJson));
                
                return objectMapper.writeValueAsString(enrichedEvent);
            } catch (Exception e) {
                // Return original event if enrichment fails
                return event;
            }
        }
        
        private String getCountryFromIP(String ip) {
            // Simplified IP geolocation - in production, use a proper service
            if (ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
                return "Internal";
            }
            return "Unknown";
        }
        
        private String getCityFromIP(String ip) {
            // Simplified implementation
            return "Unknown";
        }
        
        private double calculateRiskScore(JsonNode event) {
            double score = 0.0;
            
            String eventType = event.get("event_type").asText();
            switch (eventType) {
                case "USER_AUTHENTICATION":
                    score = 0.3;
                    break;
                case "PAYMENT_TRANSACTION":
                    score = 0.7;
                    break;
                case "DATA_ACCESS":
                    score = 0.5;
                    break;
                default:
                    score = 0.2;
            }
            
            // Increase score for external IPs
            if (event.has("geolocation") && 
                !"Internal".equals(event.get("geolocation").get("country").asText())) {
                score += 0.2;
            }
            
            return Math.min(score, 1.0);
        }
    }

    // Anomaly detection function using simple statistical methods
    public static class AnomalyDetectionFunction implements MapFunction<String, String> {
        private Map<String, EventStats> statsMap = new HashMap<>();
        
        @Override
        public String map(String event) throws Exception {
            try {
                JsonNode eventJson = objectMapper.readTree(event);
                ObjectNode enrichedEvent = (ObjectNode) eventJson;
                
                String eventType = eventJson.get("event_type").asText();
                String userId = eventJson.get("user_id").asText();
                String key = eventType + ":" + userId;
                
                EventStats stats = statsMap.computeIfAbsent(key, k -> new EventStats());
                stats.addEvent();
                
                // Simple anomaly detection based on frequency
                boolean isAnomaly = stats.isAnomaly();
                enrichedEvent.put("is_anomaly", isAnomaly);
                enrichedEvent.put("anomaly_score", stats.getAnomalyScore());
                
                return objectMapper.writeValueAsString(enrichedEvent);
            } catch (Exception e) {
                return event;
            }
        }
    }

    // Simple statistics tracking for anomaly detection
    static class EventStats {
        private long eventCount = 0;
        private long lastEventTime = System.currentTimeMillis();
        private double avgTimeBetweenEvents = 0;
        
        public void addEvent() {
            long currentTime = System.currentTimeMillis();
            if (eventCount > 0) {
                long timeDiff = currentTime - lastEventTime;
                avgTimeBetweenEvents = (avgTimeBetweenEvents * eventCount + timeDiff) / (eventCount + 1);
            }
            eventCount++;
            lastEventTime = currentTime;
        }
        
        public boolean isAnomaly() {
            if (eventCount < 3) return false;
            
            long timeSinceLastEvent = System.currentTimeMillis() - lastEventTime;
            
            // Anomaly if event frequency is much higher than average
            return timeSinceLastEvent < avgTimeBetweenEvents * 0.1;
        }
        
        public double getAnomalyScore() {
            if (eventCount < 3) return 0.0;
            
            long timeSinceLastEvent = System.currentTimeMillis() - lastEventTime;
            double ratio = timeSinceLastEvent / avgTimeBetweenEvents;
            
            if (ratio < 0.1) return 0.9;
            if (ratio < 0.3) return 0.7;
            if (ratio < 0.5) return 0.5;
            
            return 0.1;
        }
    }
}