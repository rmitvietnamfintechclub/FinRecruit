// Todo (Dev A & Dev C): Implement logic xử lý data pipeline
export const processCandidateData = async (rawPayload: any) => {
    // 1. Map dữ liệu tĩnh và gom nhóm customAnswers
    // 2. Query DB kiểm tra duplicate (Student ID & Email)
    // 3. Nếu duplicate -> check timestamp -> Update hoặc Bỏ qua
    // 4. Nếu không duplicate -> Phân loại Department theo Choice 1
    // 5. Insert vào DB
};