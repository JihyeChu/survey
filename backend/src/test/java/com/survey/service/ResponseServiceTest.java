package com.survey.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.survey.dto.ResponseDto;
import com.survey.dto.ResponseRequest;
import com.survey.entity.Form;
import com.survey.entity.Response;
import com.survey.repository.FormRepository;
import com.survey.repository.ResponseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ResponseServiceTest {

    @Mock
    private ResponseRepository responseRepository;

    @Mock
    private FormRepository formRepository;

    @InjectMocks
    private ResponseService responseService;

    private Form form;
    private Response response;
    private ResponseRequest responseRequest;

    @BeforeEach
    void setUp() {
        form = Form.builder()
                .id(1L)
                .title("테스트 설문")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        response = Response.builder()
                .id(1L)
                .form(form)
                .submittedAt(LocalDateTime.now())
                .answers(new ArrayList<>())
                .build();

        responseRequest = new ResponseRequest();
        responseRequest.setAnswers(new ArrayList<>());
    }

    @Test
    @DisplayName("응답 제출 성공")
    void submitResponse_Success() {
        given(formRepository.findById(1L)).willReturn(Optional.of(form));
        given(responseRepository.save(any(Response.class))).willReturn(response);

        ResponseDto result = responseService.submitResponse(1L, responseRequest);

        assertThat(result).isNotNull();
        assertThat(result.getFormId()).isEqualTo(1L);
        verify(responseRepository).save(any(Response.class));
    }

    @Test
    @DisplayName("존재하지 않는 폼에 응답 제출시 예외 발생")
    void submitResponse_FormNotFound() {
        given(formRepository.findById(999L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> responseService.submitResponse(999L, responseRequest))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Form not found");
    }

    @Test
    @DisplayName("응답 제출 - 답변 포함")
    void submitResponse_WithAnswers() throws Exception {
        ResponseRequest.AnswerRequest answerRequest = new ResponseRequest.AnswerRequest();
        answerRequest.setQuestionId(1L);

        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode valueNode = objectMapper.valueToTree("홍길동");
        answerRequest.setValue(valueNode);
        responseRequest.setAnswers(Arrays.asList(answerRequest));

        given(formRepository.findById(1L)).willReturn(Optional.of(form));
        given(responseRepository.save(any(Response.class))).willReturn(response);

        ResponseDto result = responseService.submitResponse(1L, responseRequest);

        assertThat(result).isNotNull();
        verify(responseRepository).save(any(Response.class));
    }

    @Test
    @DisplayName("ID로 응답 조회 성공")
    void getResponseById_Success() {
        given(responseRepository.findByIdWithAnswers(1L)).willReturn(response);

        ResponseDto result = responseService.getResponseById(1L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("존재하지 않는 응답 조회시 예외 발생")
    void getResponseById_NotFound() {
        given(responseRepository.findByIdWithAnswers(999L)).willReturn(null);

        assertThatThrownBy(() -> responseService.getResponseById(999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Response not found");
    }

    @Test
    @DisplayName("폼 ID로 응답 목록 조회")
    void getResponsesByFormId_Success() {
        Response response2 = Response.builder()
                .id(2L)
                .form(form)
                .submittedAt(LocalDateTime.now())
                .answers(new ArrayList<>())
                .build();

        given(formRepository.findById(1L)).willReturn(Optional.of(form));
        given(responseRepository.findByFormWithAnswers(form)).willReturn(Arrays.asList(response, response2));

        List<ResponseDto> result = responseService.getResponsesByFormId(1L);

        assertThat(result).hasSize(2);
    }

    @Test
    @DisplayName("존재하지 않는 폼의 응답 목록 조회시 예외 발생")
    void getResponsesByFormId_FormNotFound() {
        given(formRepository.findById(999L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> responseService.getResponsesByFormId(999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Form not found");
    }
}
