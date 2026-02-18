package com.forms.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.forms.dto.ResponseDto;
import com.forms.dto.ResponseRequest;
import com.forms.exception.GlobalExceptionHandler;
import com.forms.service.ResponseService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ResponseController.class)
@Import(GlobalExceptionHandler.class)
class ResponseControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ResponseService responseService;

    private ResponseDto responseDto;
    private ResponseRequest responseRequest;

    @BeforeEach
    void setUp() {
        responseDto = ResponseDto.builder()
                .id(1L)
                .formId(1L)
                .submittedAt(LocalDateTime.now())
                .answers(new ArrayList<>())
                .build();

        responseRequest = new ResponseRequest();
        responseRequest.setAnswers(new ArrayList<>());
    }

    @Test
    @DisplayName("POST /api/forms/{formId}/responses - 응답 제출 성공")
    void submitResponse_Success() throws Exception {
        given(responseService.submitResponse(eq(1L), any(ResponseRequest.class))).willReturn(responseDto);

        mockMvc.perform(post("/api/forms/1/responses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(responseRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.formId").value(1));
    }

    @Test
    @DisplayName("POST /api/forms/{formId}/responses - 답변 포함 응답 제출")
    void submitResponse_WithAnswers() throws Exception {
        ResponseRequest.AnswerRequest answerRequest = new ResponseRequest.AnswerRequest();
        answerRequest.setQuestionId(1L);

        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode valueNode = objectMapper.valueToTree("홍길동");
        answerRequest.setValue(valueNode);
        responseRequest.setAnswers(Arrays.asList(answerRequest));

        ResponseDto.AnswerDto answerDto = ResponseDto.AnswerDto.builder()
                .id(1L)
                .questionId(1L)
                .value("홍길동")
                .build();
        responseDto.setAnswers(Arrays.asList(answerDto));

        given(responseService.submitResponse(eq(1L), any(ResponseRequest.class))).willReturn(responseDto);

        mockMvc.perform(post("/api/forms/1/responses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(responseRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.answers.length()").value(1))
                .andExpect(jsonPath("$.answers[0].value").value("홍길동"));
    }

    @Test
    @DisplayName("POST /api/forms/{formId}/responses - 존재하지 않는 폼에 응답 제출시 404 에러")
    void submitResponse_FormNotFound() throws Exception {
        given(responseService.submitResponse(eq(999L), any(ResponseRequest.class)))
                .willThrow(new IllegalArgumentException("Form not found"));

        mockMvc.perform(post("/api/forms/999/responses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(responseRequest)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /api/forms/{formId}/responses - 폼의 응답 목록 조회 성공")
    void getFormResponses_Success() throws Exception {
        ResponseDto response2 = ResponseDto.builder()
                .id(2L)
                .formId(1L)
                .submittedAt(LocalDateTime.now())
                .answers(new ArrayList<>())
                .build();

        given(responseService.getResponsesByFormId(1L)).willReturn(Arrays.asList(responseDto, response2));

        mockMvc.perform(get("/api/forms/1/responses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[1].id").value(2));
    }

    @Test
    @DisplayName("GET /api/forms/{formId}/responses - 응답 없는 폼 조회시 빈 배열 반환")
    void getFormResponses_Empty() throws Exception {
        given(responseService.getResponsesByFormId(1L)).willReturn(new ArrayList<>());

        mockMvc.perform(get("/api/forms/1/responses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @DisplayName("GET /api/forms/{formId}/responses - 존재하지 않는 폼의 응답 조회시 404 에러")
    void getFormResponses_FormNotFound() throws Exception {
        given(responseService.getResponsesByFormId(999L))
                .willThrow(new IllegalArgumentException("Form not found"));

        mockMvc.perform(get("/api/forms/999/responses"))
                .andExpect(status().isNotFound());
    }
}
