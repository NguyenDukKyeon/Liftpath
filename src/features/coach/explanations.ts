import type { CoachReasonCode } from "./contracts.js";

const explanations: Record<CoachReasonCode, string> = {
  "schedule-prefers-three-days": "Bạn chọn 3 buổi mỗi tuần, nên Full Body giúp mỗi nhóm cơ được tập đều mà vẫn có ngày hồi phục.",
  "schedule-prefers-four-days": "Bạn chọn 4 buổi mỗi tuần, nên Upper/Lower phân bổ thân trên và thân dưới cân bằng trong tuần.",
  "schedule-prefers-six-days": "Bạn chọn 6 buổi mỗi tuần và có đủ khả năng hồi phục, nên Push/Pull/Legs có thể chia nhỏ khối lượng mỗi buổi.",
  "plan-exact-schedule-match": "Số buổi của giáo án khớp trực tiếp với lịch bạn có thể duy trì mỗi tuần.",
  "plan-session-duration-fit": "Thời lượng dự kiến của giáo án phù hợp với giới hạn thời gian bạn đã chọn.",
  "experience-prefers-full-body": "Với mức kinh nghiệm hiện tại, Full Body giúp luyện kỹ thuật thường xuyên mà không dồn quá nhiều bài vào một buổi.",
  "experience-prefers-upper-lower": "Kinh nghiệm hiện tại phù hợp với Upper/Lower để tăng khối lượng nhưng vẫn giữ lịch hồi phục rõ ràng.",
  "experience-prefers-ppl": "Push/Pull/Legs chỉ được ưu tiên khi kinh nghiệm và lịch hồi phục đủ ổn định cho sáu buổi mỗi tuần.",
  "goal-strength-compounds": "Mục tiêu sức mạnh ưu tiên các bài đa khớp chính, khoảng rep thấp hơn và thời gian nghỉ dài hơn.",
  "goal-hypertrophy-volume": "Mục tiêu tăng cơ ưu tiên khối lượng vừa đủ, rep range kiểm soát và tiến bộ từng bước nhỏ.",
  "equipment-safe-substitution": "Bài gốc cần thiết bị bạn chưa chọn, nên LiftPath đã dùng một bài cùng nhóm chuyển động phù hợp với thiết bị hiện có.",
  "restriction-safe-substitution": "Một hạn chế đã được ghi nhận, nên LiftPath đổi sang chuyển động phù hợp hơn thay vì giữ bài gốc.",
  "equipment-prescription-removed": "Không có bài thay thế an toàn với thiết bị hiện có, nên phần này được loại khỏi giáo án thay vì giữ một bài không thể thực hiện.",
  "primary-pattern-unavailable": "Một chuyển động chính không có phương án an toàn tương đương; giáo án được đánh dấu cần kiểm tra trước khi sử dụng.",
  "plan-equipment-safe": "Mọi bài trong phương án này đều dùng được với thiết bị bạn đã chọn.",
  "plan-recommended": "LiftPath chọn phương án có điểm phù hợp cao nhất dựa trên lịch, kinh nghiệm, mục tiêu, thiết bị và thời lượng buổi tập.",
  "session-time-shortened": "Thời gian hôm nay ngắn hơn dự kiến, nên LiftPath bỏ bài phụ trước và giữ các chuyển động chính khi có thể.",
  "readiness-low-energy": "Năng lượng hôm nay thấp, nên buổi tập giữ các bài chính và giảm phần phụ để duy trì kỹ thuật.",
  "readiness-high-soreness": "Mức đau mỏi hôm nay cao, nên LiftPath giảm bớt khối lượng phụ và tránh đẩy effort lên quá cao.",
  "readiness-effort-reduced": "Khả năng hồi phục hôm nay chưa tối ưu, nên mục tiêu effort được giảm một mức để còn thêm rep dự trữ.",
  "pain-blocks-movement": "Bạn báo đau bất thường ở vùng liên quan. LiftPath không tăng tải và đề xuất dừng hoặc đổi chuyển động này.",
  "pain-safe-substitution": "Chuyển động liên quan đến vùng đau đã được thay bằng lựa chọn không dùng mẫu vận động bị ảnh hưởng.",
  "no-adjustment-needed": "Thông tin readiness không cho thấy cần thay đổi; buổi tập được giữ như kế hoạch cơ sở.",
  "insufficient-evidence": "LiftPath chưa có đủ dữ liệu để tự điều chỉnh an toàn; hãy giữ mức hiện tại và đánh giá lại sau buổi tập.",
  "safe-default-plan": "Không thể tạo đầy đủ phương án từ dữ liệu hiện tại, nên LiftPath dùng giáo án Full Body cơ bản và đánh dấu phần cần kiểm tra.",
};

export const explainReason = (reasonCode: CoachReasonCode) => explanations[reasonCode];

export const COACH_EXPLANATIONS = explanations;
