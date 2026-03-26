import type { Joint } from './kinematics';
import { buildDHTable } from './kinematics';

export function exportDHJSON(joints: Joint[]): string {
  const table = buildDHTable(joints);
  const data = {
    format: 'DH-Parameters',
    convention: 'standard',
    units: { length: 'meters', angle: 'radians' },
    joints: table.map(row => ({
      index: row.index,
      type: row.type,
      a: Number(row.a.toFixed(6)),
      d: Number(row.d.toFixed(6)),
      alpha: Number(row.alpha.toFixed(6)),
      theta: Number(row.theta.toFixed(6)),
      limits: {
        thetaMin: Number(row.thetaMin.toFixed(6)),
        thetaMax: Number(row.thetaMax.toFixed(6)),
      },
    })),
  };
  return JSON.stringify(data, null, 2);
}

export function exportURDFStub(joints: Joint[]): string {
  const table = buildDHTable(joints);
  let xml = `<?xml version="1.0"?>\n`;
  xml += `<robot name="custom_arm">\n`;
  xml += `  <!-- URDF stub generated from DH parameters -->\n`;
  xml += `  <!-- This is a simplified representation; refine for actual use -->\n\n`;
  xml += `  <link name="base_link">\n`;
  xml += `    <visual>\n`;
  xml += `      <geometry><cylinder radius="0.05" length="0.02"/></geometry>\n`;
  xml += `    </visual>\n`;
  xml += `  </link>\n\n`;

  for (const row of table) {
    const linkName = `link_${row.index}`;
    const jointName = `joint_${row.index}`;
    const parentLink = row.index === 1 ? 'base_link' : `link_${row.index - 1}`;
    const jType = row.type === 'prismatic' ? 'prismatic' : 'revolute';

    xml += `  <joint name="${jointName}" type="${jType}">\n`;
    xml += `    <parent link="${parentLink}"/>\n`;
    xml += `    <child link="${linkName}"/>\n`;
    xml += `    <origin xyz="${row.a.toFixed(4)} 0 ${row.d.toFixed(4)}" rpy="0 0 ${row.theta.toFixed(4)}"/>\n`;
    xml += `    <axis xyz="0 0 1"/>\n`;
    if (jType === 'revolute') {
      xml += `    <limit lower="${row.thetaMin.toFixed(4)}" upper="${row.thetaMax.toFixed(4)}" effort="10" velocity="1"/>\n`;
    }
    xml += `  </joint>\n\n`;

    xml += `  <link name="${linkName}">\n`;
    xml += `    <visual>\n`;
    xml += `      <geometry><cylinder radius="0.03" length="${Math.max(row.a, row.d, 0.05).toFixed(4)}"/></geometry>\n`;
    xml += `    </visual>\n`;
    xml += `  </link>\n\n`;
  }

  xml += `</robot>\n`;
  return xml;
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
