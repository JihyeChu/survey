package com.survey.controller;

import com.survey.service.AdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    /**
     * 개발 환경용 DB 초기화 API
     * 모든 데이터를 삭제합니다 (외래키 제약 순서 준수)
     */
    @DeleteMapping("/reset")
    public ResponseEntity<Map<String, String>> resetDatabase() {
        log.info("Database reset request received");
        adminService.resetDatabase();

        Map<String, String> response = new HashMap<>();
        response.put("message", "모든 데이터가 초기화되었습니다.");

        log.info("Database reset completed successfully");
        return ResponseEntity.ok(response);
    }
}
