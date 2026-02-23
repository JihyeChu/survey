package com.survey.service;

import com.survey.repository.AnswerRepository;
import com.survey.repository.QuestionRepository;
import com.survey.repository.ResponseRepository;
import com.survey.repository.FormRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 관리자 기능 서비스
 * 개발 환경에서만 사용되는 기능을 포함합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AdminService {

    private final AnswerRepository answerRepository;
    private final ResponseRepository responseRepository;
    private final QuestionRepository questionRepository;
    private final FormRepository formRepository;

    /**
     * 데이터베이스 초기화
     * 외래키 제약 조건을 고려하여 다음 순서로 삭제합니다:
     * 1. answers (response의 외래키 참조)
     * 2. responses (form의 외래키 참조)
     * 3. questions (form의 외래키 참조)
     * 4. forms (모든 데이터의 상위 엔티티)
     */
    public void resetDatabase() {
        try {
            log.info("데이터베이스 초기화 시작");

            // 1. answers 삭제
            log.info("Answers 테이블 삭제 시작");
            answerRepository.deleteAll();
            log.info("Answers 테이블 삭제 완료");

            // 2. responses 삭제
            log.info("Responses 테이블 삭제 시작");
            responseRepository.deleteAll();
            log.info("Responses 테이블 삭제 완료");

            // 3. questions 삭제
            log.info("Questions 테이블 삭제 시작");
            questionRepository.deleteAll();
            log.info("Questions 테이블 삭제 완료");

            // 4. forms 삭제
            log.info("Forms 테이블 삭제 시작");
            formRepository.deleteAll();
            log.info("Forms 테이블 삭제 완료");

            log.info("데이터베이스 초기화 완료");
        } catch (Exception e) {
            log.error("데이터베이스 초기화 중 오류 발생", e);
            throw new RuntimeException("데이터베이스 초기화에 실패했습니다: " + e.getMessage());
        }
    }
}
