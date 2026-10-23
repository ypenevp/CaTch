package com.legends.server.device.repository;

import com.legends.server.device.entity.Device;
import com.legends.server.device.entity.DeviceMeasurement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeviceMeasurementRepository extends JpaRepository<DeviceMeasurement, Long> {
    List<DeviceMeasurement> findTop120ByDeviceOrderByRecordedAtDescIdDesc(Device device);

    void deleteByDeviceAndIdNotIn(Device device, List<Long> ids);
}
